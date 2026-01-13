import os
import requests
import json
from pathlib import Path
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(env_path)

SILICONFLOW_API_KEY = os.getenv("SILICONFLOW_API_KEY")

def generate_image_flux(prompt: str, output_path: str, width: int = 1024, height: int = 576):
    """
    使用 SiliconFlow 的 Flux.1-schnell 模型生成图片
    
    Args:
        prompt: 英文提示词
        output_path: 图片保存路径
        width: 图片宽度 (默认 1024, 16:9比例)
        height: 图片高度 (默认 576, 16:9比例)
    """
    if not SILICONFLOW_API_KEY:
        print("❌ 错误: 未找到 SILICONFLOW_API_KEY，请在 .env 文件中配置。")
        return False

    url = "https://api.siliconflow.cn/v1/images/generations"
    
    headers = {
        "Authorization": f"Bearer {SILICONFLOW_API_KEY}",
        "Content-Type": "application/json"
    }

    # 使用 Kolors 模型 (用户反馈该模型在 SiliconFlow 上是完全免费的)
    payload = {
        "model": "Kwai-Kolors/Kolors",
        "prompt": prompt,
        "image_size": f"{width}x{height}",
        "num_inference_steps": 20 # Kolors 建议步数多一点
    }

    print(f"🎨 正在生成图片: {prompt[:50]}...")
    
    try:
        response = requests.post(url, json=payload, headers=headers)
        response.raise_for_status() # 检查 HTTP 错误
        
        result = response.json()
        
        if 'data' in result and len(result['data']) > 0:
            image_url = result['data'][0]['url']
            
            # 下载图片
            img_data = requests.get(image_url).content
            
            # 确保目录存在
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            
            with open(output_path, 'wb') as f:
                f.write(img_data)
                
            print(f"✅ 图片已保存: {output_path}")
            return True
        else:
            print(f"❌ 生成失败，API 返回异常: {result}")
            return False
            
    except Exception as e:
        print(f"❌ 请求发生错误: {str(e)}")
        if 'response' in locals():
            print(f"响应内容: {response.text}")
        return False

if __name__ == "__main__":
    # 测试代码
    test_prompt = "A futuristic city with flying cars, cyberpunk style, neon lights, 4k resolution, cinematic lighting"
    test_output = "test_flux.png"
    generate_image_flux(test_prompt, test_output)
