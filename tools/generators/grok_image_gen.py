import asyncio
from playwright.async_api import async_playwright
import os
import requests

async def grok_generate_images(prompt, output_dir="remotion-studio/public/assets/projects/demo/images/generated", aspect_ratio="16:9"):
    """
    使用 Grok Imagine 进行文生图自动化，支持比例选择
    """
    async with async_playwright() as p:
        try:
            browser = await p.chromium.connect_over_cdp("http://localhost:9222")
            print("✅ 已成功连接到 Chrome 调试端口")
        except Exception as e:
            print(f"❌ 无法连接到 Chrome: {e}")
            return

        context = browser.contexts[0]
        page = context.pages[0]
        
        # 1. 跳转到 Imagine 页面
        print(f"🌐 正在跳转到 Grok Imagine 页面: {prompt}")
        await page.goto("https://grok.com/imagine")
        await page.wait_for_load_state("networkidle")
        await asyncio.sleep(2)
        
        try:
            # 2. 设置模式和比例
            print(f"⚙️ 正在检查模式并设置比例为 {aspect_ratio}...")
            model_trigger = page.locator("#model-select-trigger")
            if await model_trigger.count() > 0:
                await model_trigger.click()
                await asyncio.sleep(0.5)
                
                # 检查并切换到“图片”模式
                image_menu_item = page.locator('div[role="menuitem"]:has-text("图片")')
                if await image_menu_item.count() > 0:
                    await image_menu_item.first.click()
                    await asyncio.sleep(0.5)
                    # 点击完可能菜单会关掉，如果我们要调比例可能需要再点开
                    if await model_trigger.get_attribute("data-state") == "closed":
                        await model_trigger.click()
                        await asyncio.sleep(0.5)
                
                # 设置比例
                ratio_btn = page.locator(f'button[aria-label="{aspect_ratio}"]')
                if await ratio_btn.count() > 0:
                    print(f"📐 已选择比例: {aspect_ratio}")
                    await ratio_btn.click()
                    await asyncio.sleep(0.5)
                
                # 再次点击 trigger 或者是按 Esc 确保菜单关闭（如果还在的话）
                if await model_trigger.get_attribute("data-state") == "open":
                    await page.keyboard.press("Escape")

            # 3. 输入 Prompt
            print("⌨️ 正在定位输入框...")
            editor_selector = 'div.ProseMirror[contenteditable="true"]'
            editor = page.locator(editor_selector).first
            await editor.wait_for(state="visible", timeout=15000)
            await editor.click()
            
            print(f"🖋️ 正在输入提示词: {prompt}")
            await editor.fill("")
            await editor.press_sequentially(prompt, delay=20)
            await asyncio.sleep(0.5)

            # 4. 点击发送
            print("🚀 正在提交生成指令...")
            submit_btn_selector = 'button[aria-label="提交"], button[type="submit"]'
            submit_button = page.locator(submit_btn_selector).last
            if await submit_button.is_disabled():
                await page.keyboard.press("Enter")
            else:
                await submit_button.click()
            
            print("⏳ 正在等待图片生成 (可能需要 20-60 秒)...")
            img_selector = 'img[alt="Generated image"]'
            
            # 持续监控图片，直到数量稳定且不再是加载占位符
            await asyncio.sleep(30) # 先等基础生成时间
            
            # 获取所有生成的图片并过滤
            images = page.locator(img_selector)
            total_count = await images.count()
            print(f"✨ 检测到 {total_count} 张候选图片，正在进行智能筛选...")

            os.makedirs(output_dir, exist_ok=True)
            import base64
            import time

            saved_count = 0
            # 倒序检查最后 8 张（防止历史记录干扰，且包含最新生成的 4 张）
            start_check = max(0, total_count - 8)
            for i in range(total_count - 1, start_check - 1, -1):
                if saved_count >= 4: # 我们只想要最新的 4 张成品
                    break
                    
                img = images.nth(i)
                try:
                    src = await img.get_attribute("src", timeout=5000)
                    if not src: continue

                    # 智能过滤：加载占位图通常 Base64 特别短 (或者是模糊的缩略图)
                    # 正常的 Grok 图片 Base64 通常大于 100KB
                    if src.startswith("data:image"):
                        header, data = src.split(",", 1)
                        decoded_data = base64.b64decode(data)
                        if len(decoded_data) < 50000: # 小于 50KB 认为是加载占位图
                            print(f"⏩ 过滤掉疑似加载图 (索引 {i+1}, 大小: {len(decoded_data)} bytes)")
                            continue
                        
                        file_name = f"grok_gen_{int(time.time())}_{saved_count+1:02}.png"
                        save_path = os.path.join(output_dir, file_name)
                        with open(save_path, "wb") as f:
                            f.write(decoded_data)
                        print(f"✅ 图片 {saved_count+1} 已保存 (Base64): {file_name}")
                        saved_count += 1
                    
                    elif src.startswith("blob:"):
                        # Blob 很难判断大小，通过截图保存
                        file_name = f"grok_gen_{int(time.time())}_{saved_count+1:02}.png"
                        save_path = os.path.join(output_dir, file_name)
                        await img.screenshot(path=save_path)
                        print(f"✅ 图片 {saved_count+1} 已截图保存: {file_name}")
                        saved_count += 1
                    
                    else:
                        # 普通 URL
                        file_name = f"grok_gen_{int(time.time())}_{saved_count+1:02}.png"
                        save_path = os.path.join(output_dir, file_name)
                        response = requests.get(src, stream=True, timeout=10)
                        if response.status_code == 200:
                            with open(save_path, 'wb') as f:
                                for chunk in response.iter_content(chunk_size=8192):
                                    f.write(chunk)
                            print(f"✅ 图片 {saved_count+1} 已下载保存 (URL): {file_name}")
                            saved_count += 1
                except Exception as e:
                    print(f"❌ 筛选第 {i+1} 张图片时遇到问题: {e}")

            print(f"🎉 任务完成！共保存 {saved_count} 张最近生成的成品图。")

        except Exception as e:
            print(f"❌ 操作过程中发生错误: {e}")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description='Grok T2I Automation')
    parser.add_argument('prompt', type=str, help='Image prompt')
    parser.add_argument('--ratio', type=str, default='16:9', help='Aspect ratio (16:9, 9:16, 1:1, 3:2, 2:3)')
    args = parser.parse_args()
    
    asyncio.run(grok_generate_images(args.prompt, aspect_ratio=args.ratio))
