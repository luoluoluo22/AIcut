import os
import json
import time
import requests
import subprocess
import sys
import tempfile
from typing import List, Dict, Optional
from aicut_sdk import AIcutClient
from dotenv import load_dotenv
import asyncio
import edge_tts
import re

# 强制 UTF-8 编码，防止 Windows 下输出乱码
if sys.stdout.encoding.lower() != 'utf-8':
    try:
        if hasattr(sys.stdout, 'reconfigure'):
            sys.stdout.reconfigure(encoding='utf-8')
        if hasattr(sys.stderr, 'reconfigure'):
            sys.stderr.reconfigure(encoding='utf-8')
    except:
        pass

print("[AI Daemon] Script loaded. Initializing heartbeat...", flush=True)

load_dotenv()

# 配置
WORKSPACE_ROOT = os.environ.get('WORKSPACE_ROOT', os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
api_port = os.environ.get('API_PORT', '3000')
BASE_URL = f"http://localhost:{api_port}"
POLL_INTERVAL = 0.5

class AIDaemon:
    def __init__(self):
        self.workspace_root = os.path.abspath(WORKSPACE_ROOT)
        self.client = AIcutClient(BASE_URL)
        self.processed_tasks = set()
        self.tts_cooldowns = {}
        
    def log(self, msg):
        print(f"[AI Daemon] {msg}", flush=True)

    def get_snapshot(self):
        try:
            # 优先通过接口获取，保证最新且包含 assets 信息
            return self.client._get("getSnapshot")
        except Exception as e:
            self.log(f"Error getting snapshot via API: {e}")
            return None

    def get_file_duration(self, file_path):
        try:
            cmd = ['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', file_path]
            result = subprocess.run(cmd, capture_output=True, check=False)
            if result.returncode == 0:
                output = result.stdout.decode('utf-8', errors='replace').strip()
                return float(output)
        except Exception as e:
            pass
        return None

    def find_local_file(self, filename, target_duration=None, hint_path=None):
        skip_dirs = {'.git', 'node_modules', '.next', 'dist-electron', 'dist', 'bin', 'obj', 'ai_workspace'}
        target_name = filename.strip()
        
        # 1. 如果有通过媒体信息传来的绝对路径，优先使用
        if hint_path and os.path.exists(hint_path):
            self.log(f"Using absolute path from project assets: {hint_path}")
            return os.path.normpath(hint_path)

        # 2. 直接检查
        if os.path.isabs(target_name) and os.path.exists(target_name):
            return target_name

        # 2. 构造搜索根目录 (包含更深层的查找)
        # 如果工作区在 f:\桌面\开发\AIcut, 我们希望搜到 f:\桌面 的内容
        search_roots = [
            self.workspace_root,
            os.path.join(self.workspace_root, 'public'),
            os.path.join(self.workspace_root, 'AIcut-Studio', 'apps', 'web', 'public'),
            os.path.dirname(self.workspace_root), # f:\桌面\开发
            os.path.dirname(os.path.dirname(self.workspace_root)) # f:\桌面
        ]

        # self.log(f"Searching for file: '{target_name}' in {search_roots}")

        # 先查文件名完全匹配的 (尝试带/不带后缀)
        name_no_ext = os.path.splitext(target_name)[0].lower()
        for base in search_roots:
            if not os.path.exists(base): continue
            for root, dirs, files in os.walk(base):
                dirs[:] = [d for d in dirs if d not in skip_dirs]
                for f in files:
                    f_lower = f.lower()
                    f_no_ext = os.path.splitext(f_lower)[0]
                    if f_lower == target_name.lower() or f_no_ext == name_no_ext:
                        found = os.path.normpath(os.path.join(root, f))
                        # self.log(f"Match found by name: {found}")
                        return found

        # 3. 时长匹配 (放宽到 2秒 误差，针对视频文件)
        if target_duration:
            self.log(f"No name match, trying duration match ({target_duration:.2f}s, tolerance 2s)...")
            for base in search_roots:
                if not os.path.exists(base): continue
                for root, dirs, files in os.walk(base):
                    dirs[:] = [d for d in dirs if d not in skip_dirs]
                    for f in files:
                        if f.lower().endswith(('.mp4', '.mp3', '.wav', '.m4a', '.mov', '.webm')):
                            path = os.path.join(root, f)
                            d = self.get_file_duration(path)
                            if d and abs(d - target_duration) < 2.0:
                                self.log(f"Match found by duration: {f} ({d:.2f}s)")
                                return os.path.normpath(path)
        return None

    def recognize_and_sync(self, file_path, element_id, element_config):
        api_key = os.environ.get("GROQ_API_KEY")
        if not api_key:
            self.log("Error: GROQ_API_KEY is not set.")
            return

        temp_audio = None
        try:
            self.log(f"Element Config Debug: {element_config}")
            trim_start = element_config.get('trimStart', 0)
            trim_end = element_config.get('trimEnd', 0)
            asset_duration = element_config.get('duration', 0)
            el_start = element_config.get('startTime', 0)
            
            # 计算片元在时间轴上的实际可见长度
            effective_dur = asset_duration - trim_start - trim_end
            if effective_dur <= 0.1:
                # 容错：如果计算结果太小，可能 duration 指的是可见长度
                effective_dur = max(0.1, asset_duration)
                
            self.log(f"Recognizing: {os.path.basename(file_path)} (File Offset: {trim_start:.2f}s, Visible Len: {effective_dur:.2f}s)")

            # 统一提取音频子集
            temp_dir = tempfile.gettempdir()
            temp_audio = os.path.join(temp_dir, f"aicut_slice_{int(time.time())}.wav")
            
            self.log(f"Extracting precise WAV slice: {trim_start}s for {effective_dur}s...")
            # 使用 ffmpeg 提取对应片段 (使用 wav 以获得更准确的时间戳)
            cmd = [
                "ffmpeg", "-y", "-ss", str(trim_start), "-t", str(effective_dur),
                "-i", file_path, "-vn", "-ar", "16000", "-ac", "1", "-f", "wav", temp_audio
            ]
            proc = subprocess.run(cmd, capture_output=True, check=False)
            if proc.returncode != 0:
                 self.log(f"FFmpeg Error Output: {proc.stderr.decode('utf-8', 'ignore')}")

            work_file = temp_audio if os.path.exists(temp_audio) and os.path.getsize(temp_audio) > 100 else file_path
            is_sliced = (work_file == temp_audio)

            # Check file size for Groq API limit (25MB)
            file_size_mb = os.path.getsize(work_file) / (1024 * 1024)
            if file_size_mb > 24:
                self.log(f"Audio file is too large ({file_size_mb:.2f}MB > 25MB limit). Attempting compression...")
                mp3_file = work_file.replace('.wav', '.mp3') if work_file.endswith('.wav') else work_file + '.mp3'
                try:
                    # Convert to mono mp3 at 32k to minimize size
                    cmd_compress = [
                        "ffmpeg", "-y", "-i", work_file, 
                        "-ac", "1", "-ar", "16000", "-b:a", "32k", 
                        mp3_file
                    ]
                    subprocess.run(cmd_compress, capture_output=True, check=True)
                    if os.path.exists(mp3_file) and os.path.getsize(mp3_file) > 100:
                        work_file = mp3_file
                        file_size_mb = os.path.getsize(work_file) / (1024 * 1024)
                        self.log(f"Compressed to MP3: {file_size_mb:.2f}MB")
                    else:
                        self.log("Compression failed, file not created.")
                except Exception as e:
                    self.log(f"Compression error: {e}")

            if file_size_mb > 24:
                self.log(f"Skipping recognition: File still too large ({file_size_mb:.2f}MB) for API.")
                if is_sliced and os.path.exists(work_file): os.remove(work_file)
                return

            # 1. 不再自动清除该区域原有的 AI 字幕 (支持用户要求的“追加”模式)
            # self.log(f"Clearing existing subtitles in range [{el_start:.2f}, {el_start+effective_dur:.2f}]")
            # self.client.clear_subtitles(start_time=el_start, duration=effective_dur)

            # 2. 调用 Groq (Whisper)
            url = "https://api.groq.com/openai/v1/audio/transcriptions"
            headers = {"Authorization": f"Bearer {api_key}"}
            
            try:
                with open(work_file, "rb") as f:
                    files = {"file": (os.path.basename(work_file), f)}
                    data = {
                        "model": "whisper-large-v3-turbo",
                        "response_format": "verbose_json",
                        "language": "zh",
                        "timestamp_granularities[]": ["word", "segment"]
                    }
                    resp = requests.post(url, headers=headers, files=files, data=data, timeout=120)
                    if resp.status_code != 200:
                        self.log(f"Groq API Error: {resp.status_code} - {resp.text}")
                        # Don't crash, just return
                        if is_sliced and os.path.exists(work_file): os.remove(work_file)
                        return
                    result = resp.json()
                    # 打印原始返回结果，供用户排查 (Original API result logging)
                    self.log(f"Groq Raw Result: {json.dumps(result, ensure_ascii=False)[:200]}...") # Limit log size
            except Exception as req_err:
                self.log(f"API Request Failed: {req_err}")
                if is_sliced and os.path.exists(work_file): os.remove(work_file)
                return

            segments = result.get("segments") or []
            words = result.get("words") or []
            
            # 调试：打印第一个词的开始时间
            if words:
                self.log(f"First word detected at: {words[0]['start']:.2f}s")

            subtitles = []
            
            if not segments and words:
                # 如果没有 segment 但有 word，我们需要自行构造 (Groq 有时会这样)
                self.log("No segments returned, grouping words into sentences...")
                current_sub = None
                for w in words:
                    # 如果两个词之间间隔 > 1.5s，或者是标点符号结尾，则断句
                    if not current_sub:
                        current_sub = {"text": w["word"], "start": w["start"], "end": w["end"]}
                    else:
                        if w["start"] - current_sub["end"] > 1.2:
                            subtitles.append(current_sub)
                            current_sub = {"text": w["word"], "start": w["start"], "end": w["end"]}
                        else:
                            current_sub["text"] += w["word"]
                            current_sub["end"] = w["end"]
                if current_sub:
                    subtitles.append(current_sub)
                
                # 转换格式以便后续处理
                processed_segments = subtitles
            else:
                # 如果有 segment，利用 word 级别的时间戳来缩减 segment 的边无用边界
                processed_segments = []
                for seg in segments:
                    seg_start = seg["start"]
                    seg_end = seg["end"]
                    seg_text = seg["text"].strip()
                    
                    # 在 word 列表中找到属于这个 segment 的词
                    sub_words = [w for w in words if w["start"] >= seg_start - 0.1 and w["end"] <= seg_end + 0.1]
                    if sub_words:
                        # 使用第一个词的开始和最后一个词的结束，剔除前后的空白
                        true_start = sub_words[0]["start"]
                        true_end = sub_words[-1]["end"]
                        processed_segments.append({"start": true_start, "end": true_end, "text": seg_text})
                    else:
                        processed_segments.append(seg)

            final_subtitles = []
            for seg in processed_segments:
                s, e = seg.get("start"), seg.get("end")
                text = seg.get("text", "").strip()
                self.log(f"  > Refined Segment: [{s:.2f}s - {e:.2f}s] text: {text}")
                if not text: continue
                
                # 如果是切片，结果时间是相对于 0 的
                # 如果是全量，结果时间是相对于文件开头的
                if is_sliced:
                    sync_s = el_start + s
                    sync_e = el_start + e
                else:
                    # 过滤和映射
                    if e <= trim_start or s >= (trim_start + effective_dur): continue
                    v_s = max(trim_start, s)
                    v_e = min(trim_start + effective_dur, e)
                    sync_s = el_start + (v_s - trim_start)
                    sync_e = el_start + (v_e - trim_start)
                
                if sync_e - sync_s > 0.1:
                    # 避免字幕过长 (比如 Whisper 把一段很长的空白也算进去了)
                    if len(text) < 5 and (sync_e - sync_s) > 4:
                        self.log(f"Skipping potentially stretched subtitle: {text}")
                        continue
                        
                    subtitles.append({
                        "text": text,
                        "startTime": sync_s,
                        "duration": sync_e - sync_s,
                    })

            if subtitles:
                self.client.add_subtitles(subtitles)
                self.log(f"Synced {len(subtitles)} subtitles.")
            else:
                self.log("No speech segments detected.")

        except Exception as e:
            self.log(f"Error during recognition: {e}")
        finally:
            if temp_audio and os.path.exists(temp_audio):
                try: os.remove(temp_audio)
                except: pass

    def emit_event(self, action, data):
        """
        通过标准输出直接发送事件给 Electron 前端 (IPC)
        格式: ::AI_EVENT::{json_data}
        """
        payload = {
            "id": f"evt_{int(time.time()*1000)}",
            "action": action,
            "data": data,
            "timestamp": int(time.time())
        }
        # 使用特殊前缀供前端解析
        print(f"::AI_EVENT::{json.dumps(payload)}", flush=True)

    async def generate_tts(self, text_elements):
        # 去重: 根据 ID 去重，防止前端发来重复请求
        unique_elements = {}
        now = time.time()
        
        for el in text_elements:
            el_id = el.get("id")
            # Check cooldown (10 seconds)
            if el_id in self.tts_cooldowns:
                if now - self.tts_cooldowns[el_id] < 10:
                    self.log(f"  > Skipping {el_id} (cooldown)")
                    continue
            
            unique_elements[el_id] = el
            self.tts_cooldowns[el_id] = now
            
        text_elements = list(unique_elements.values())
        
        if not text_elements:
            self.log("No new TTS tasks to process.")
            return

        self.log(f"Starting Parallel TTS generation for {len(text_elements)} segments...")
        
        # 确保输出目录存在 (在 public 下以便预览)
        output_dir = os.path.join(self.workspace_root, "AIcut-Studio", "apps", "web", "public", "assets", "tts")
        os.makedirs(output_dir, exist_ok=True)
        
        # 并发处理
        # Create tasks
        tasks = [self._process_single_tts(el, output_dir) for el in text_elements]
        results = await asyncio.gather(*tasks)
        
        # 过滤掉失败的结果 (None)
        valid_results = [r for r in results if r is not None]

        if valid_results:
            self.log(f"TTS generation completed. Sending batch event with {len(valid_results)} items.")
            # 批量返回结果，减少 IPC 拥堵
            self.emit_event("importAudioBatch", {
                "items": valid_results
            })
        else:
            self.log("TTS generation completed but no audio files were generated.")

    async def _process_single_tts(self, el, output_dir):
        text = el.get("content", "")
        el_id = el.get("id")
        start_time = el.get("startTime", 0)
        voice_id = el.get("voiceId", "zh-CN-XiaoxiaoNeural")  # 默认使用晓晓
        
        if not text:
            return None
            
        filename = f"tts_{el_id}.mp3"
        filepath = os.path.join(output_dir, filename)
        
        self.log(f"  > Generating voice for: {text[:20]}... (voice: {voice_id})")
        
        try:
            # Always regenerate to ensure latest text content is used
            # 使用 edge-tts 生成语音
            communicate = edge_tts.Communicate(text, voice_id)
            await communicate.save(filepath)
            # Ensure file is flushed
            await asyncio.sleep(0.5)

            # Verify file integrity
            if not os.path.exists(filepath) or os.path.getsize(filepath) < 100:
                raise Exception("Generated audio file is too small or missing")
            
            # 返回结果而不是直接发送
            return {
                "filePath": filepath,
                "name": f"TTS: {text[:10]}",
                "startTime": start_time,
                "duration": None # Let frontend calculate
            }
            
        except Exception as e:
            self.log(f"  X Error generating TTS for segment {el_id}: {e}")
            return None

    async def generate_tts_preview(self, voice_id: str, text: str):
        """生成音色试听预览"""
        self.log(f"Generating TTS preview for voice: {voice_id}")
        
        output_dir = os.path.join(self.workspace_root, "AIcut-Studio", "apps", "web", "public", "assets", "tts")
        os.makedirs(output_dir, exist_ok=True)
        
        # 使用音色ID作为文件名，只替换非法字符（保留字母数字和破折号）
        safe_voice_id = re.sub(r'[^a-zA-Z0-9-]', '_', voice_id)
        filename = f"preview_{safe_voice_id}.mp3"
        filepath = os.path.join(output_dir, filename)
        
        try:
            # 检查文件是否已存在且有效 (增量缓存)
            if os.path.exists(filepath) and os.path.getsize(filepath) > 1000:
                self.log(f"  > Start preview using cached file: {filename}")
                return

            # 使用 edge-tts 生成语音
            communicate = edge_tts.Communicate(text, voice_id)
            await communicate.save(filepath)
            await asyncio.sleep(0.3)
            
            if os.path.exists(filepath) and os.path.getsize(filepath) > 100:
                self.log(f"  > Preview generated: {filename}")
            else:
                raise Exception("Generated preview file is too small or missing")
                
        except Exception as e:
            self.log(f"  X Error generating TTS preview: {e}")

    def run(self):
        self.log(f"AI Daemon started. Root: {self.workspace_root}")
        poll_count = 0
        while True:
            try:
                poll_count += 1
                resp = self.client._get("getPendingEdits")
                if poll_count % 20 == 0:
                    # self.log("Heartbeat...")
                    pass

                edits = resp.get("edits", [])
                processed_ids = []
                
                for task in edits:
                    task_id = task.get("id")
                    if task_id in self.processed_tasks or task.get("processed"):
                        continue
                    
                    # 立即标记为正在处理/已处理，避免 polling 重复抓取
                    self.processed_tasks.add(task_id)
                    self.client._post("markProcessed", {"ids": [task_id]})
                    
                    if task.get("action") == "requestTask":
                        data = task.get("data", {})
                        if data.get("taskType") == "subtitle_generation":
                            m_name = data.get("mediaName")
                            m_id = data.get("mediaId")
                            e_id = data.get("elementId")
                            
                            self.log(f"New Recognition Task: {m_name}")
                            
                            # 获取快照
                            resp = self.get_snapshot()
                            snap = resp.get("snapshot") if resp and resp.get("success") else None
                            el_config = None
                            m_dur = None
                            if snap:
                                for t in snap.get("tracks", []):
                                    for el in t.get("elements", []):
                                        if el["id"] == e_id:
                                            el_config = el
                                            break
                                    if el_config: break
                                for asset in snap.get("assets", []):
                                    if asset["id"] == m_id:
                                        m_dur = asset.get("duration")
                                        break
                                        
                            if el_config:
                                m_path_hint = None
                                if snap:
                                    for asset in snap.get("assets", []):
                                        if asset["id"] == m_id:
                                            m_path_hint = asset.get("filePath")
                                            break
                                
                                file_path = self.find_local_file(m_name, m_dur, m_path_hint)
                                if file_path:
                                    self.recognize_and_sync(file_path, e_id, el_config)
                                else:
                                    self.log(f"File not found on disk: {m_name}")
                            else:
                                self.log(f"Element {e_id} not found in project snapshot.")
                        elif data.get("taskType") == "tts_generation":
                            text_elements = data.get("textElements", [])
                            asyncio.run(self.generate_tts(text_elements))
                        elif data.get("taskType") == "tts_preview":
                            voice_id = data.get("voiceId", "zh-CN-XiaoxiaoNeural")
                            text = data.get("text", "这是一段试听文本")
                            asyncio.run(self.generate_tts_preview(voice_id, text))

            except Exception as e:
                self.log(f"Poll error: {e}")
                
            time.sleep(POLL_INTERVAL)

if __name__ == "__main__":
    AIDaemon().run()
