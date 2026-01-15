import os
import requests
import json
from pathlib import Path
from dotenv import load_dotenv
import argparse
import sys

# load environment variables
load_dotenv()
# Try loading from parent directories if not found
current_dir = Path(__file__).parent
env_path = current_dir.parent / '.env'
if env_path.exists():
    load_dotenv(env_path)

SILICONFLOW_API_KEY = os.getenv("SILICONFLOW_API_KEY")

def generate_image_flux(prompt: str, output_path: str, width: int = 1024, height: int = 576):
    """
    Use SiliconFlow's Flux.1-schnell model to generate an image.

    Args:
        prompt: English prompt.
        output_path: Path to save the image.
        width: Image width (default 1024, 16:9 ratio).
        height: Image height (default 576, 16:9 ratio).
    """
    if not SILICONFLOW_API_KEY:
        print("Error: SILICONFLOW_API_KEY not found. Please configure in .env file.")
        return False

    url = "https://api.siliconflow.cn/v1/images/generations"
    
    headers = {
        "Authorization": f"Bearer {SILICONFLOW_API_KEY}",
        "Content-Type": "application/json"
    }

    # Use Kolors model
    payload = {
        "model": "Kwai-Kolors/Kolors",
        "prompt": prompt,
        "image_size": f"{width}x{height}",
        "num_inference_steps": 25
    }

    print(f"Generating image: {prompt[:50]}...")
    
    try:
        response = requests.post(url, json=payload, headers=headers)
        response.raise_for_status() # Check for HTTP errors
        
        result = response.json()
        
        if 'data' in result and len(result['data']) > 0:
            image_url = result['data'][0]['url']
            
            # Download image
            img_data = requests.get(image_url).content
            
            # Ensure directory exists
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            
            with open(output_path, 'wb') as f:
                f.write(img_data)
                
            print(f"Image saved: {output_path}")
            return True
        else:
            print(f"Generation failed, API returned abnormal result: {result}")
            return False
            
    except Exception as e:
        print(f"Request error: {str(e)}")
        if 'response' in locals():
            print(f"Response content: {response.text}")
        return False

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--prompt", help="Prompt text")
    parser.add_argument("--output", help="Output path")
    
    args = parser.parse_args()
    
    if args.prompt and args.output:
        # CLI mode
        success = generate_image_flux(args.prompt, args.output)
        if not success:
            sys.exit(1)
    else:
        # Test mode
        test_prompt = "A futuristic city with flying cars, cyberpunk style, neon lights, 4k resolution, cinematic lighting"
        test_output = "test_flux.png"
        generate_image_flux(test_prompt, test_output)
