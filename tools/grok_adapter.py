import asyncio
import os
import sys
import argparse
from playwright.async_api import async_playwright
import subprocess

# Ensure UTF-8 output for Windows
sys.stdout.reconfigure(encoding='utf-8')

async def ensure_chrome_connected(p):
    """确保连接到 Chrome 调试端口，如果没开则尝试启动"""
    try:
        browser = await p.chromium.connect_over_cdp("http://localhost:9222")
        return browser
    except Exception:
        # 寻找 Chrome 路径
        chrome_paths = [
            r"C:\Program Files\Google\Chrome\Application\chrome.exe",
            r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
            os.path.expanduser("~") + r"\AppData\Local\Google\Chrome\Application\chrome.exe"
        ]
        chrome_exe = next((path for path in chrome_paths if os.path.exists(path)), None)
        
        if not chrome_exe:
            print("Error: Chrome executable not found.")
            return None

        # 计算 Profile 绝对路径 (项目根目录下的 chrome_debug_profile)
        script_dir = os.path.dirname(os.path.abspath(__file__))
        project_root = os.path.dirname(script_dir)
        user_data_dir = os.path.join(project_root, "chrome_debug_profile")
        
        print(f"Launching Chrome with profile: {user_data_dir}")
        cmd = [chrome_exe, "--remote-debugging-port=9222", f"--user-data-dir={user_data_dir}"]
        
        subprocess.Popen(cmd)
        await asyncio.sleep(5)
        
        try:
            return await p.chromium.connect_over_cdp("http://localhost:9222")
        except Exception as e:
            print(f"Error: Failed to connect to Chrome: {e}")
            return None

async def generate_video(mode, prompt, image_path, output_dir):
    async with async_playwright() as p:
        browser = await ensure_chrome_connected(p)
        if not browser: return False

        context = browser.contexts[0]
        page = context.pages[0]

        try:
            await page.goto("https://grok.com/imagine", timeout=60000)
            await page.wait_for_load_state("domcontentloaded", timeout=60000)
        except: pass
        await asyncio.sleep(2)

        # 1. 轮询检测是否进入就绪状态（处理验证码）
        selectors = [
            'textarea[aria-label*="Grok"]',
            'textarea[aria-label*="问题"]',
            'textarea[aria-label*="想象"]',
            'div.ProseMirror[contenteditable="true"]',
            'textarea',
            '[role="textbox"]'
        ]

        editor = None
        print("Waiting for editor... Please solve any CAPTCHA in Chrome window.")
        for attempt in range(150): # 5 分钟等待
            for sel in selectors:
                try:
                    loc = page.locator(sel).first
                    if await loc.count() > 0 and await loc.is_visible():
                        editor = loc
                        break
                except: continue
            if editor: break
            
            # 每隔 30 秒打印进度
            if attempt > 0 and attempt % 15 == 0:
                print(f"Still waiting for Grok (attempt {attempt})...")
            await asyncio.sleep(2)

        if not editor:
            print("Error: Timeout waiting for editor.")
            return False

        # 2. 执行不同模式的逻辑
        if mode == 'image' and image_path:
            # 图生视频
            abs_image_path = os.path.abspath(image_path)
            file_input = await page.query_selector('input[type="file"]')
            if file_input:
                await file_input.set_input_files(abs_image_path)
                await asyncio.sleep(2)
                # 等待专用的视频 prompt textarea 出现
                try:
                    video_prompt_sel = 'textarea[aria-label="制作视频"], textarea[placeholder*="视频"]'
                    textarea = await page.wait_for_selector(video_prompt_sel, timeout=10000)
                    if prompt:
                        await textarea.fill(prompt)
                except:
                    # 兜底：直接在主编辑框输入
                    await editor.fill(prompt)
            else:
                print("Error: File input not found.")
                return False
        else:
            # 文生视频
            # 切换到视频模式逻辑
            model_trigger = page.locator("#model-select-trigger")
            if await model_trigger.count() > 0:
                await model_trigger.click()
                await asyncio.sleep(1)
                video_menu_item = page.locator('div[role="menuitem"]:has-text("视频")')
                if await video_menu_item.count() > 0:
                    await video_menu_item.first.click()
                    await asyncio.sleep(1)
                if await model_trigger.get_attribute("data-state") == "open":
                    await page.keyboard.press("Escape")
            
            await editor.fill(prompt)

        # 3. 提交任务
        submit_selectors = ['button[aria-label="提交"]', 'button[type="submit"]', 'button:has(svg path[d*="M6 11"])']
        submitted = False
        for sel in submit_selectors:
            try:
                btn = page.locator(sel).last
                if await btn.count() > 0 and await btn.is_enabled():
                    await btn.click()
                    submitted = True
                    break
            except: continue
        if not submitted: await page.keyboard.press("Enter")

        # 4. 等待生成并处理 A/B Test
        print("Generation started, waiting for result...")
        regen_sel = 'button:has-text("重新生成")'
        existing_count = await page.locator(regen_sel).count()
        
        new_video_found = False
        for _ in range(150):
            # 自动跳过 A/B 测试
            try:
                skip_btn = page.get_by_text("跳过")
                if await skip_btn.count() > 0:
                    await skip_btn.first.click()
                    await asyncio.sleep(1)
            except: pass

            if await page.locator(regen_sel).count() > existing_count:
                new_video_found = True
                break
            await asyncio.sleep(2)
        
        if not new_video_found:
            print("Error: Generation timeout.")
            return False

        # 5. 下载结果
        os.makedirs(output_dir, exist_ok=True)
        filename = f"grok_video_{int(asyncio.get_event_loop().time())}.mp4"
        save_path = os.path.join(output_dir, filename)
        
        try:
            async with page.expect_download(timeout=60000) as download_info:
                dl_btn = page.locator('button[aria-label="下载"]').last
                try: await dl_btn.click(timeout=5000)
                except: await dl_btn.click(force=True, timeout=5000)
            
            download = await download_info.value
            await download.save_as(save_path)
            print(f"OUTPUT_PATH:{save_path}")
            return True
        except Exception as e:
            print(f"Error downloading: {e}")
            return False

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", required=True, choices=['text', 'image'])
    parser.add_argument("--prompt", default="")
    parser.add_argument("--image", default="")
    parser.add_argument("--output_dir", required=True)
    args = parser.parse_args()
    try:
        asyncio.run(generate_video(args.mode, args.prompt, args.image, args.output_dir))
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)
