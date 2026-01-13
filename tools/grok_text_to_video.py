import asyncio
import os
import requests
from playwright.async_api import async_playwright
import argparse

async def grok_text_to_video(prompt, output_dir="remotion-studio/public/assets/projects/demo/videos", aspect_ratio="16:9", upgrade_hd=True):
    """
    使用 Grok Imagine 进行文生视频自动化
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
        print(f"🌐 正在跳转到 Grok Imagine 页面进行文生视频: {prompt}")
        await page.goto("https://grok.com/imagine")
        await page.wait_for_load_state("networkidle")
        await asyncio.sleep(2)
        
        try:
            # 2. 设置模式为“视频”并设置比例
            print(f"⚙️ 正在切换到‘视频’模式并设置比例为 {aspect_ratio}...")
            model_trigger = page.locator("#model-select-trigger")
            if await model_trigger.count() > 0:
                await model_trigger.click()
                await asyncio.sleep(0.5)
                
                # 点击菜单中的“视频”项
                video_menu_item = page.locator('div[role="menuitem"]:has-text("视频")')
                if await video_menu_item.count() > 0:
                    await video_menu_item.first.click()
                    print("📹 已切换到视频模式")
                    await asyncio.sleep(0.5)
                    
                    # 切换回比例设置（切换模式后菜单可能关闭）
                    if await model_trigger.get_attribute("data-state") == "closed":
                        await model_trigger.click()
                        await asyncio.sleep(0.5)
                
                # 设置比例
                ratio_btn = page.locator(f'button[aria-label="{aspect_ratio}"]')
                if await ratio_btn.count() > 0:
                    await ratio_btn.click()
                    print(f"📐 已选择比例: {aspect_ratio}")
                    await asyncio.sleep(0.5)
                
                # 关闭菜单
                if await model_trigger.get_attribute("data-state") == "open":
                    await page.keyboard.press("Escape")

            # 3. 输入 Prompt
            print("⌨️ 正在定位输入框...")
            editor_selector = 'div.ProseMirror[contenteditable="true"]'
            editor = page.locator(editor_selector).first
            await editor.wait_for(state="visible", timeout=15000)
            await editor.click()
            
            print(f"🖋️ 正在输入视频提示词: {prompt}")
            await editor.fill("")
            await editor.press_sequentially(prompt, delay=20)
            await asyncio.sleep(0.5)

            # 4. 点击发送
            print("🚀 正在提交视频生成指令...")
            submit_btn_selector = 'button[aria-label="提交"], button[type="submit"]'
            submit_button = page.locator(submit_btn_selector).last
            if await submit_button.is_disabled():
                await page.keyboard.press("Enter")
            else:
                await submit_button.click()
            
            print("⏳ 正在等待视频生成 (预计需要 1-3 分钟)...")
            
            # 等待预览视频生成完成（通过“下载”按钮出现来判断）
            download_selector = 'button[aria-label="下载"]'
            try:
                await page.wait_for_selector(download_selector, timeout=240000) # 给 4 分钟时间
                print("✨ 预览视频已生成")

                # ⚠️ 处理 A/B 测试反馈弹窗
                skip_btn = page.get_by_text("跳过")
                if await skip_btn.count() > 0:
                    print("🛡️ 检测到意见反馈/AB测试界面，正在点击‘跳过’...")
                    await skip_btn.first.click()
                    await asyncio.sleep(1.0)
                    
            except Exception as e:
                print(f"❌ 等待视频生成超时: {e}")
                return

            # 5. 可选：执行 HD 升级 (逻辑同 grok_bridge.py)
            if upgrade_hd:
                print("🚀 正在尝试执行 HD 升级以获取高清画面...")
                more_btn_selector = 'button[aria-label="更多选项"], button:has(.lucide-ellipsis)'
                more_btn = page.locator(more_btn_selector).last
                
                if await more_btn.count() > 0:
                    await more_btn.click()
                    await asyncio.sleep(1.0)
                    
                    upgrade_item = page.get_by_text("升级视频")
                    if await upgrade_item.count() > 0:
                        print("🎯 发现‘升级视频’选项，正在点击...")
                        await upgrade_item.first.click()
                        print("✅ 已启动高清渲染，等待刷新 (约 1-2 分钟)...")
                        await asyncio.sleep(15) 
                        await page.wait_for_selector(download_selector, timeout=120000)
                    else:
                        print("⚠️ 菜单中未发现‘升级视频’选项，可能已是最高画质。")

            # 6. 下载视频
            print("📥 准备下载视频...")
            os.makedirs(output_dir, exist_ok=True)
            video_name = f"grok_t2v_{int(asyncio.get_event_loop().time())}.mp4"
            save_path = os.path.join(output_dir, video_name)
            
            # 提取 Cookies
            cookies = await context.cookies()
            cookie_dict = {c['name']: c['value'] for c in cookies}
            headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36"}

            async with page.expect_download() as download_info:
                download_btn = page.locator(download_selector).last
                await download_btn.click(force=True)
            
            download = await download_info.value
            await download.save_as(save_path)
            
            # 检查文件完整性并尝试重下 (Requests 兜底)
            if os.path.getsize(save_path) < 100 * 1024:
                print(f"⚠️ 下载文件过小 ({os.path.getsize(save_path)} bytes)，尝试直链重下...")
                video_url = download.url
                response = requests.get(video_url, cookies=cookie_dict, headers=headers, stream=True)
                if response.status_code == 200:
                    with open(save_path, 'wb') as f:
                        for chunk in response.iter_content(chunk_size=8192):
                            f.write(chunk)
            
            print(f"✅ 视频已保存至: {save_path} ({os.path.getsize(save_path)} bytes)")
            print("🎉 文生视频任务完成！")

        except Exception as e:
            print(f"❌ 运行过程中发生错误: {e}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Grok T2V Automation')
    parser.add_argument('prompt', type=str, help='Video prompt')
    parser.add_argument('--ratio', type=str, default='16:9', help='Aspect ratio (16:9, 9:16, 1:1, 3:2, 2:3)')
    parser.add_argument('--no-upgrade', action='store_true', help='Skip HD upgrade')
    args = parser.parse_args()
    
    asyncio.run(grok_text_to_video(args.prompt, aspect_ratio=args.ratio, upgrade_hd=not args.no_upgrade))
