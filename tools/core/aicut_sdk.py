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
    
    def get_api_info(self) -> Dict:
        """获取 API 信息"""
        resp = requests.get(self.api_url)
        resp.raise_for_status()
        return resp.json()
    
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

    def import_media(self, file_path: str, media_type: str = "video", name: str = None, start_time: float = 0, duration: float = None, track_id: str = None) -> Dict:
        """导入媒体文件 (通用)
        
        Args:
            file_path: 文件路径
            media_type: 媒体类型 ("video", "audio", "image")
            name: 名称
            start_time: 开始时间
            duration: 持续时间
            track_id: 指定轨道ID (可选)
        """
        import os
        return self._post("importMedia", {
            "filePath": file_path,
            "type": media_type,
            "name": name or os.path.basename(file_path),
            "startTime": start_time,
            "duration": duration,
            "trackId": track_id
        })

    def import_video(self, file_path: str, name: str = None, start_time: float = 0, track_id: str = None) -> Dict:
        """导入视频"""
        return self.import_media(file_path, "video", name, start_time, track_id=track_id)

    def import_image(self, file_path: str, duration: float = 5, name: str = None, start_time: float = 0, track_id: str = None) -> Dict:
        """导入图片"""
        return self.import_media(file_path, "image", name, start_time, duration, track_id=track_id)


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
