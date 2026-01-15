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
        browser = None
        try:
            # 尝试直接连接
            browser = await p.chromium.connect_over_cdp("http://localhost:9222")
            print("✅ 已成功连接到 Chrome 调试端口")
        except Exception as e:
            print(f"⚠️ 无法直接连接到 Chrome (端口开放了吗?): {e}")
            print("🚀 尝试自动启动 Chrome 调试模式...")
            
            import subprocess
            
            # Chrome 常用路径，可根据实际情况添加
            chrome_paths = [
                r"C:\Program Files\Google\Chrome\Application\chrome.exe",
                r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
                os.path.expanduser("~") + r"\AppData\Local\Google\Chrome\Application\chrome.exe"
            ]
            
            chrome_exe = None
            for path in chrome_paths:
                if os.path.exists(path):
                    chrome_exe = path
                    break
            
            if not chrome_exe:
                print("❌ 未找到 Chrome 可执行文件，请手动启动 Chrome 并开启 --remote-debugging-port=9222")
                return

            user_data_dir = os.path.abspath("chrome_debug_profile")
            cmd = [
                chrome_exe,
                "--remote-debugging-port=9222",
                f"--user-data-dir={user_data_dir}"
            ]
            
            try:
                subprocess.Popen(cmd)
                print("⏳ 正在启动 Chrome，等待 5 秒...")
                await asyncio.sleep(5)
                
                # 重试连接
                browser = await p.chromium.connect_over_cdp("http://localhost:9222")
                print("✅ 已成功启动并连接到 Chrome")
            except Exception as launch_err:
                print(f"❌ 启动或连接 Chrome 失败: {launch_err}")
                return

        context = browser.contexts[0]
        page = context.pages[0]
        
        # 1. 跳转到 Imagine 页面
        print(f"🌐 正在跳转到 Grok Imagine 页面进行文生视频: {prompt}")
        try:
            await page.goto("https://grok.com/imagine", timeout=60000)
            await page.wait_for_load_state("domcontentloaded", timeout=60000)
        except Exception as e:
            print(f"⚠️ 页面加载可能有延迟，尝试继续... {e}")
        
        await asyncio.sleep(3)
        
        try:
            # 2. 设置模式为“视频”并设置比例
            print(f"⚙️ 正在切换到‘视频’模式并设置比例为 {aspect_ratio}...")
            model_trigger = page.locator("#model-select-trigger")
            if await model_trigger.count() > 0:
                await model_trigger.click()
                await asyncio.sleep(1)
                
                # 点击菜单中的“视频”项
                video_menu_item = page.locator('div[role="menuitem"]:has-text("视频")')
                if await video_menu_item.count() > 0:
                    await video_menu_item.first.click()
                    print("📹 已切换到视频模式")
                    await asyncio.sleep(1)
                    
                    # 切换回比例设置（切换模式后菜单可能关闭）
                    if await model_trigger.get_attribute("data-state") == "closed":
                        await model_trigger.click()
                        await asyncio.sleep(1)
                
                # 设置比例
                ratio_btn = page.locator(f'button[aria-label="{aspect_ratio}"]')
                if await ratio_btn.count() > 0:
                    await ratio_btn.click()
                    print(f"📐 已选择比例: {aspect_ratio}")
                    await asyncio.sleep(1)
                
                # 关闭菜单
                if await model_trigger.get_attribute("data-state") == "open":
                    await page.keyboard.press("Escape")

            # 3. 输入 Prompt
            print("⌨️ 正在定位输入框...")
            selectors = [
                'textarea[aria-label*="Grok"]',
                'textarea[aria-label*="问题"]',
                'textarea[aria-label*="想象"]',
                'div.ProseMirror[contenteditable="true"]',
                'textarea',
                '[role="textbox"]'
            ]
            
            editor = None
            for sel in selectors:
                try:
                    loc = page.locator(sel).first
                    if await loc.count() > 0:
                        editor = loc
                        break
                except: continue
            
            if not editor:
                print("❌ 无法定位到输入框")
                return

            await editor.wait_for(state="visible", timeout=15000)
            await editor.click()
            
            print(f"🖋️ 正在输入视频提示词 (直接填充)...")
            await editor.fill(prompt)  # 直接填充，比逐字快
            await asyncio.sleep(0.5)

            # 4. 点击发送
            print("🚀 正在提交视频生成指令...")
            
            # 定义下载按钮选择器 (Fix NameError)
            download_selector = 'button[aria-label="下载"]'

            submit_btn_selector = 'button[aria-label="提交"], button[type="submit"]'
            submit_button = page.locator(submit_btn_selector).last
            
            if await submit_button.is_disabled():
                 await page.keyboard.press("Enter")
            else:
                 await submit_button.click()
            
            print("⏳ 正在等待视频生成 (预计需要 1-3 分钟)...")
            
            # 等待预览视频生成完成
            # 用户提示：以出现"重新生成"按钮为标准
            regenerate_btn_selector = 'button:has-text("重新生成")'
            
            # --- 先记录现有数量，防止被历史按钮干扰 ---
            existing_regen_count = await page.locator(regenerate_btn_selector).count()
            print(f"⏳ 等待'重新生成'按钮出现... (当前已有 {existing_regen_count} 个)")
            
            try:
                # 循环轮询直到数量增加
                new_video_generated = False
                for _ in range(150):  # 最多等 5 分钟 (150 * 2秒 = 300秒)
                    # ⚠️ 处理 A/B 测试反馈弹窗
                    skip_btn = page.get_by_text("跳过")
                    if await skip_btn.count() > 0:
                         print("🛡️ 检测到 A/B 测试，自动点击‘跳过’")
                         await skip_btn.first.click()
                         await asyncio.sleep(1)

                    current_count = await page.locator(regenerate_btn_selector).count()
                    if current_count > existing_regen_count:
                        new_video_generated = True
                        break
                    await asyncio.sleep(2)
                
                if not new_video_generated:
                    print("❌ 超时：未检测到新的'重新生成'按钮")
                    return

                print("✨ 检测到新'重新生成'按钮，预览视频已生成！")
                
                # ⚠️ 处理 A/B 测试反馈弹窗
                skip_btn = page.get_by_text("跳过")
                if await skip_btn.count() > 0:
                     await skip_btn.first.click()
                     await asyncio.sleep(1)
            except Exception as e:
                print(f"❌ 等待视频生成超时 (未检测到重新生成按钮): {e}")
                return

            # 5. 可选：执行 HD 升级
            if upgrade_hd:
                print("🚀 正在尝试执行 HD 升级以获取高清画面...")
                try:
                    more_btn_selector = 'button[aria-label="更多选项"], button:has(.lucide-ellipsis)'
                    more_btn = page.locator(more_btn_selector).last
                    
                    # 同样需等待更多按钮可用
                    if await more_btn.count() > 0:
                         for _ in range(10): 
                            if await more_btn.is_enabled(): break
                            await asyncio.sleep(0.5)
                         
                         if await more_btn.is_enabled():
                            # force=True 强行点击，绕过遮挡层
                            await more_btn.click(timeout=5000, force=True)
                            await asyncio.sleep(1.0)
                            
                            upgrade_item = page.get_by_text("升级视频")
                            if await upgrade_item.count() > 0:
                                print("🎯 发现‘升级视频’选项，正在点击...")
                                await upgrade_item.first.click(timeout=5000, force=True)
                                print("✅ 已启动高清渲染，等待刷新... (HD 比较慢)")
                                await asyncio.sleep(15) 
                                await page.wait_for_selector(download_selector, timeout=180000)
                                # 再次等待下载按钮变亮
                                download_btn = page.locator(download_selector).last
                                for _ in range(60):
                                    if await download_btn.is_enabled(): break
                                    await asyncio.sleep(1)
                            else:
                                 print("⚠️ 菜单中未发现‘升级视频’选项，可能已是最高画质。")
                                 await page.keyboard.press("Escape")
                         else:
                             print("⚠️ ‘更多’按钮不可用，跳过升级")
                except Exception as hd_err:
                     print(f"⚠️ HD 升级步骤遇到小问题 (不影响基础视频): {hd_err}")

        except Exception as main_err:
             print(f"❌ 自动化交互流程出错: {main_err}")
             return

        # 6. 下载视频
        print("📥 准备下载视频...")
        os.makedirs(output_dir, exist_ok=True)
        video_name = f"grok_t2v_{int(asyncio.get_event_loop().time())}.mp4"
        save_path = os.path.join(output_dir, video_name)
        
        # 提取 Cookies
        cookies = await context.cookies()
        cookie_dict = {c['name']: c['value'] for c in cookies}
        headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36"}

        # 增加一点延迟，确保事件绑定
        await asyncio.sleep(1)

        try:
            async with page.expect_download(timeout=60000) as download_info:
                download_btn = page.locator(download_selector).last
                # 再次确保可用再点击
                if await download_btn.is_enabled():
                    # force=True 强行点击
                    await download_btn.click(force=True)
                else:
                    print("❌ 下载按钮在最后关头不可用！")
                    return
            
            download = await download_info.value
            await download.save_as(save_path)
        except Exception as dl_err:
             print(f"❌ Playwright 下载失败，尝试 fallback 下载: {dl_err}")
             # 如果 Playwright 下载失败，尝试获取 URL 用 requests 下载
             # 注意：这里可能拿不到 URL，因为点击没触发下载事件
             return

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

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Grok T2V Automation')
    parser.add_argument('prompt', type=str, help='Video prompt')
    parser.add_argument('--ratio', type=str, default='16:9', help='Aspect ratio (16:9, 9:16, 1:1, 3:2, 2:3)')
    parser.add_argument('--no-upgrade', action='store_true', help='Skip HD upgrade')
    args = parser.parse_args()
    
    asyncio.run(grok_text_to_video(args.prompt, aspect_ratio=args.ratio, upgrade_hd=not args.no_upgrade))
