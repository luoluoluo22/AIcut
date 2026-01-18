"""
AIcut Python SDK - 用于程序化编辑视频项目

示例用法:
    from aicut_sdk import AIcutClient
    
    client = AIcutClient("http://localhost:3000")
    
    # 添加字幕
    client.add_subtitle("欢迎观看", start_time=0, duration=3)
    
    # 批量添加字幕
    client.add_subtitles([
        {"text": "第一段字幕", "startTime": 0, "duration": 2},
        {"text": "第二段字幕", "startTime": 2, "duration": 2},
    ])
"""

import requests
from typing import List, Dict, Optional


class AIcutClient:
    """AIcut 编辑器客户端"""
    
    def __init__(self, base_url: str = "http://localhost:3000"):
        self.base_url = base_url.rstrip("/")
        self.api_url = f"{self.base_url}/api/ai-edit"
    
    def _post(self, action: str, data: Dict = None) -> Dict:
        """发送 POST 请求到 AI Edit API"""
        payload = {"action": action}
        if data:
            payload["data"] = data
        
        resp = requests.post(self.api_url, json=payload)
        resp.raise_for_status()
        return resp.json()
    
    def _get(self, action: str) -> Dict:
        """发送 GET 请求"""
        resp = requests.get(f"{self.api_url}?action={action}")
        resp.raise_for_status()
        return resp.json()

    def _post_raw(self, endpoint: str, json: Dict) -> Dict:
        """发送原始 POST 请求到指定端点 (如缩略图生成)"""
        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        resp = requests.post(url, json=json)
        resp.raise_for_status()
        return resp.json()
    
    def get_api_info(self) -> Dict:
        """获取 API 信息"""
        resp = requests.get(self.api_url)
        resp.raise_for_status()
        return resp.json()
    
    
    def _get_media_duration(self, file_path: str) -> float:
        """使用 ffprobe 获取媒体文件时长"""
        import subprocess
        try:
            cmd = ['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', file_path]
            output = subprocess.check_output(cmd).decode('utf-8').strip()
            return float(output)
        except Exception as e:
            # print(f"警告: 无法获取媒体时长 {file_path}: {e}")
            return 0.0

    def add_subtitle(
        self,
        text: str,
        start_time: float = 0,
        duration: float = 5,
        x: int = 960,
        y: int = 900,
        font_size: int = 48,
        color: str = "#FFFFFF",
        background_color: str = "rgba(0,0,0,0.7)",
        text_align: str = "center",
        font_family: str = "Arial"
    ) -> Dict:
        """添加单个字幕
        
        Args:
            text: 字幕文本
            start_time: 开始时间（秒）
            duration: 持续时间（秒）
            x: X坐标（默认居中）
            y: Y坐标（默认底部）
            font_size: 字体大小
            color: 字体颜色
            background_color: 背景颜色
            text_align: 对齐方式
            font_family: 字体
        """
        return self._post("addSubtitle", {
            "text": text,
            "startTime": start_time,
            "duration": duration,
            "x": x,
            "y": y,
            "fontSize": font_size,
            "color": color,
            "backgroundColor": background_color,
            "textAlign": text_align,
            "fontFamily": font_family
        })
    
    def add_subtitles(self, subtitles: List[Dict]) -> Dict:
        """批量添加字幕
        
        Args:
            subtitles: 字幕列表，每个字幕包含:
                - text: 字幕文本 (必需)
                - startTime: 开始时间（秒）
                - duration: 持续时间（秒）
                - x, y: 坐标
                - fontSize: 字体大小
                - color: 颜色
        
        示例:
            client.add_subtitles([
                {"text": "第一段", "startTime": 0, "duration": 2},
                {"text": "第二段", "startTime": 2, "duration": 2},
            ])
        """
        return self._post("addMultipleSubtitles", {
            "subtitles": subtitles
        })
    
    def clear_subtitles(self, start_time: float = None, duration: float = None) -> Dict:
        """清除指定范围内的字幕
        
        Args:
            start_time: 开始时间（秒），如果不传则清除所有
            duration: 时长（秒）
        """
        payload = {}
        if start_time is not None:
            payload["startTime"] = start_time
        if duration is not None:
            payload["duration"] = duration
        return self._post("clearSubtitles", payload)
    
    def remove_element(self, element_id: str) -> Dict:
        """移除指定元素
        
        Args:
            element_id: 元素ID
        """
        return self._post("removeElement", {
            "elementId": element_id
        })
    
    def update_element(self, element_id: str, updates: Dict) -> Dict:
        """更新元素属性
        
        Args:
            element_id: 元素ID
            updates: 要更新的属性字典
        """
        return self._post("updateElement", {
            "elementId": element_id,
            "updates": updates
        })

    def import_audio(self, file_path: str, name: str = None, start_time: float = 0, duration: float = None) -> Dict:
        """导入本地音频文件到时间轴
        
        Args:
            file_path: 本地音频文件路径
            name: 显示名称（可选，默认使用文件名）
            start_time: 在时间轴上的起始时间（秒）
            duration: 音频时长（秒，可选）
        """
        import os
        return self._post("importAudio", {
            "filePath": file_path,
            "name": name or os.path.basename(file_path),
            "startTime": start_time,
            "duration": duration
        })

    def get_snapshot(self) -> Dict:
        """获取当前项目完整快照"""
        res = self._get("getSnapshot")
        if not res.get("success"):
            raise Exception(f"获取快照失败: {res.get('error')}")
        return res.get("snapshot", {})

    def update_snapshot(self, snapshot: Dict) -> Dict:
        """全量更新项目快照"""
        return self._post("updateSnapshot", snapshot)

    def import_media(self, file_path: str, media_type: str = "video", name: str = None, start_time: float = 0, duration: float = None, track_id: str = None, track_name: str = None) -> Dict:
        """导入媒体文件 (模仿 demo_file_driven 逻辑)
        
        通过直接更新 Snapshot 的方式实现，这种方式最稳定，支持本地绝对路径。
        """
        import os
        import urllib.parse
        import uuid
        import time

        abs_path = os.path.abspath(file_path)
        file_name = name or os.path.basename(abs_path)
        
        # 1. 获取当前状态
        snapshot = self.get_snapshot()
        assets = snapshot.get("assets", [])
        tracks = snapshot.get("tracks", [])
        
        # 2. 构造 Asset
        asset_id = f"asset_{hash(abs_path) % 1000000}_{int(os.path.getmtime(abs_path) if os.path.exists(abs_path) else 0)}"
        
        # 路径编码
        encoded_path = urllib.parse.quote(abs_path)
        serve_url = f"/api/media/serve?path={encoded_path}"
        
        # 默认使用路径本身作为缩略图 (如图片)
        thumbnail_url = serve_url
        
        # 如果是视频，尝试生成真实的缩略图
        if media_type == "video":
            try:
                thumb_res = self._post_raw("/api/media/generate-thumbnail", {"filePath": abs_path})
                if thumb_res.get("success"):
                    thumbnail_url = thumb_res.get("thumbnailUrl")
            except Exception as e:
                pass
                # print(f"警告: 视频缩略图生成失败: {e}")
        
        # 如果没有指定时长，尝试自动探测
        if duration is None:
            if media_type == "image":
                duration = 5.0
            else:
                duration = self._get_media_duration(abs_path)
        
        # 检查是否已存在
        existing_asset = next((a for a in assets if a.get("filePath") == abs_path or a.get("id") == asset_id), None)
        if not existing_asset:
            new_asset = {
                "id": asset_id,
                "name": file_name,
                "type": media_type,
                "url": serve_url,
                "thumbnailUrl": thumbnail_url, # 使用生成的缩略图
                "filePath": abs_path,
                "duration": duration or 0,
                "isLinked": True
            }
            assets.append(new_asset)
            snapshot["assets"] = assets # Ensure list is attached
        else:
            asset_id = existing_asset["id"]
            # 即使 Asset 存在，也更新其 thumbnailUrl
            existing_asset["thumbnailUrl"] = thumbnail_url
            serve_url = existing_asset.get("url", serve_url)

        # 3. 找到或创建目标轨道
        target_track = None
        
        # 确定轨道类型
        track_type = "audio" if media_type == "audio" else "media"
        default_name = "Audio Track" if media_type == "audio" else "Media Track"

        if track_id:
            target_track = next((t for t in tracks if t.get("id") == track_id), None)
        
        if not target_track and track_name:
            # 搜索同名轨道
            target_track = next((t for t in tracks if t.get("name") == track_name), None)

        if not target_track:
            # 只有在没有显式指定轨道名称时，才寻找匹配类型的默认轨道
            if not track_name:
                target_track = next((t for t in tracks if t.get("type") == track_type and not t.get("isMain")), None)

        if not target_track:
            # 如果没有，创建一个新的匹配类型的轨道
            new_track_id = str(uuid.uuid4())
            target_track = {
                "id": new_track_id,
                "name": track_name or default_name,
                "type": track_type,
                "elements": [],
                "muted": False
            }
            tracks.append(target_track)
            snapshot["tracks"] = tracks # Ensure list is attached

        # 4. 构造 Element
        new_element = {
            "id": str(uuid.uuid4()),
            "type": "media",
            "mediaId": asset_id,
            "name": file_name,
            "thumbnailUrl": thumbnail_url,   # 使用实际生成的缩略图 URL
            "startTime": start_time,
            "duration": duration or 5.0,
            "trimStart": 0,
            "trimEnd": 0,
            "muted": False,
            "volume": 1,
            "x": 960,
            "y": 540,
            "scale": 1,
            "rotation": 0,
            "opacity": 1,
            "metadata": {
                "importSource": "sdk_v2"
            }
        }
        
        target_track["elements"].append(new_element)
        
        # 5. 回写状态
        return self.update_snapshot(snapshot)

    def import_video(self, file_path: str, name: str = None, start_time: float = 0, track_id: str = None) -> Dict:
        """导入视频"""
        return self.import_media(file_path, "video", name, start_time, track_id=track_id)

    def import_image(self, file_path: str, duration: float = 5, name: str = None, start_time: float = 0, track_id: str = None) -> Dict:
        """导入图片"""
        return self.import_media(file_path, "image", name, start_time, duration, track_id=track_id)

    def switch_project(self, project_id: str) -> Dict:
        """切换项目（如果ID不存在，系统会自动初始化一个新项目）
        
        Args:
            project_id: 项目唯一标识符
        """
        return self._post("switchProject", {"projectId": project_id})

    def archive_project(self, project_id: Optional[str] = None) -> Dict:
        """归档当前工作区到项目文件夹
        
        Args:
            project_id: 项目ID（可选，如果不传，API会尝试从当前快照中检测）
        """
        payload = {}
        if project_id:
            payload["projectId"] = project_id
        return self._post("archiveProject", payload)

    def delete_project(self, project_id: str) -> Dict:
        """删除物理项目文件夹（注意：不可逆）
        
        Args:
            project_id: 要删除的项目 ID
        """
        return self._post("deleteProject", {"projectId": project_id})


def demo():
    """演示 AIcut SDK 用法"""
    print("🎬 AIcut Python SDK 演示")
    print("=" * 50)
    
    # 创建客户端
    client = AIcutClient()
    
    # 检查连接
    print("\n📡 检查 AIcut API...")
    try:
        info = client.get_api_info()
        print(f"   ✅ {info.get('message', 'Connected')}")
        print(f"   版本: {info.get('version', 'Unknown')}")
    except requests.exceptions.ConnectionError:
        print("   ❌ 无法连接到 AIcut Studio")
        print("   请确保开发服务器正在运行: npm run dev")
        return
    except Exception as e:
        print(f"   ❌ 错误: {e}")
        return
    
    # 清除现有字幕
    print("\n🗑️  清除现有字幕...")
    result = client.clear_subtitles()
    print(f"   ✅ 编辑已排队: {result.get('editId', '')}")
    
    # 添加新字幕
    print("\n📝 添加字幕...")
    subtitles = [
        {"text": "🎬 欢迎观看 AIcut 演示", "startTime": 0, "duration": 3, "fontSize": 56},
        {"text": "这是通过 Python API 添加的字幕", "startTime": 3, "duration": 3},
        {"text": "AI 可以自动生成和编辑字幕", "startTime": 6, "duration": 3},
        {"text": "支持批量操作和实时同步", "startTime": 9, "duration": 3},
        {"text": "🎉 感谢观看！", "startTime": 12, "duration": 3, "color": "#FFD700", "fontSize": 64},
    ]
    
    result = client.add_subtitles(subtitles)
    print(f"   ✅ 编辑已排队: {result.get('editId', '')}")
    print(f"   共添加 {len(subtitles)} 个字幕")
    
    print("\n" + "=" * 50)
    print("🎉 完成！字幕将在 2 秒内出现在 AIcut Studio")
    print("   👉 http://localhost:3000/editor/demo")


if __name__ == "__main__":
    demo()
