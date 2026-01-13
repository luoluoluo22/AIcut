import asyncio
from playwright.async_api import async_playwright
import os

async def grok_generate_video(image_path, prompt="Make this image move into a high quality cinematic video", video_id="01"):
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
        print("🌐 正在跳转到 Grok Imagine 页面...")
        await page.goto("https://grok.com/imagine")
        await page.wait_for_load_state("networkidle")
        
        print(f"📄 当前页面标题: {await page.title()}")
        
        # 确保图片路径是绝对路径
        abs_image_path = os.path.abspath(image_path)
        
        try:
            # 2. 上传图片
            print("📤 正在上传图片...")
            file_input = await page.query_selector('input[type="file"]')
            if file_input:
                await file_input.set_input_files(abs_image_path)
                print(f"✅ 图片注入成功: {abs_image_path}")
            else:
                print("❌ 未找到上传入口")
                return

            # 3. 等待新界面加载 (视频创作界面)
            print("⏳ 正在等待视频创作界面加载...")
            video_prompt_selector = 'textarea[aria-label="制作视频"], textarea[placeholder="输入自定义视频..."]'
            try:
                # 等待 15 秒让 Grok 反应并切换 UI
                textarea = await page.wait_for_selector(video_prompt_selector, timeout=15000)
                print("✨ 已进入视频创作界面")
                
                # 4. 输入自定义 Prompt
                print(f"⌨️ 正在输入指令: {prompt}")
                await textarea.click()
                await textarea.fill(prompt)
                await asyncio.sleep(0.5)
                
                # 5. 点击发送 (在这个新界面下寻找发送按钮)
                print("🚀 正在发送指令...")
                # 寻找那个圆形的发送按钮
                send_button = await page.query_selector('button[type="submit"], button:has(svg path[d*="M6 11"])')
                if send_button:
                    await send_button.click()
                else:
                    await page.keyboard.press("Enter")
                print("✨ 任务已下达！")
                
            except Exception as e:
                print(f"⚠️ 未检测到自定义输入框，可能 Grok 已开始默认生成: {e}")

            # 3. 发送
            await asyncio.sleep(0.5)
            print("⌨️ 正在尝试按 Enter 键发送...")
            await page.keyboard.press("Enter")
            
            # 备选发送逻辑
            await asyncio.sleep(1.0)
            send_btn_selector = 'button[aria-label="提交"], button[type="submit"]:has(path[d*="M6 11L12 5"])'
            send_button = await page.query_selector(send_btn_selector)
            if send_button:
                await send_button.click()
            
            print("🚀 请求已发出！开始等待视频生成...")

            # 4. 等待生成结果并处理 HD 升级
            # 视频生成通常需要 30s - 2min
            print("⏳ 正在监控视频生成结果...")
            
            # 首先找到更多选项按钮（通常是三个点或类似的触发器，根据 HTML 判断需要先点击它弹出菜单）
            # 或者直接寻找“升级视频”文字
            try:
                # 等待初始预览生成并出现“更多/菜单”触发动作
                # 在 Grok Imagine 中，通常需要 hover 到图片上才会出现下载和更多按钮
                # 我们先等待下载按钮出现作为“生成完成”的标志
                await page.wait_for_selector('button[aria-label="下载"]', timeout=180000)
                print("✨ 预览视频已生成")

                # ⚠️ 处理 A/B 测试反馈弹窗
                skip_btn = page.get_by_text("跳过")
                if await skip_btn.count() > 0:
                    print("🛡️ 检测到意见反馈/AB测试界面，正在点击‘跳过’...")
                    await skip_btn.first.click()
                    await asyncio.sleep(1.0)

                # 5. 执行 HD 升级
                print("🚀 正在尝试执行 HD 升级以获取高清画面...")
                
                # 使用测试成功的精准选择器寻找到“更多选项”按钮
                more_btn_selector = 'button[aria-label="更多选项"], button:has(.lucide-ellipsis)'
                more_btn = page.locator(more_btn_selector).last
                
                if await more_btn.count() > 0:
                    print("🖱️ 正在点击‘更多选项’按钮...")
                    await more_btn.scroll_into_view_if_needed()
                    await more_btn.click()
                    await asyncio.sleep(1.0)
                    
                    upgrade_item = page.get_by_text("升级视频")
                    if await upgrade_item.count() > 0:
                        print("🎯 发现‘升级视频’选项，正在点击...")
                        await upgrade_item.first.click()
                        print("✅ 已点击“升级视频”，正在等待高清渲染 (预计 1-2 分钟)...")
                        # 升级后，等待“下载”内容刷新
                        await asyncio.sleep(15) 
                        await page.wait_for_selector('button[aria-label="下载"]', timeout=120000)
                    else:
                        print("⚠️ 菜单中未发现‘升级视频’选项。")
                else:
                    print("⚠️ 未找到‘更多选项’按钮。")

                # 6. 下载高清视频
                print("📥 准备下载高清视频...")
                download_selector = 'button[aria-label="下载"]'
                # 使用 locator 确保我们操作的是最新的元素
                download_btn = page.locator(download_selector).last
                
                # 健壮性增强：等待元素稳定并处理可能的遮挡
                async with page.expect_download() as download_info:
                    print("🖱️ 正在尝试点击下载按钮 (包含遮挡处理)...")
                    
                    # 首先尝试 hover 触发 UI 状态
                    try:
                        await download_btn.hover(timeout=5000)
                    except:
                        pass
                    
                    await asyncio.sleep(1.0)
                    
                    # 使用 force=True 绕过可能的透明层遮挡
                    # 也可以尝试直接通过 JavaScript 点击
                    try:
                        await download_btn.click(force=True, timeout=10000)
                    except Exception as click_err:
                        print(f"⚠️ 常规点击失败，尝试 JS 强制点击: {click_err}")
                        await page.evaluate('(sel) => { document.querySelectorAll(sel)[document.querySelectorAll(sel).length - 1].click() }', download_selector)
                
                download = await download_info.value
                video_url = download.url
                print(f"🔗 获取到视频下载链接: {video_url}")

                # 确定保存路径
                video_dir = os.path.join(os.getcwd(), "remotion-studio/public/assets/projects/demo/videos")
                os.makedirs(video_dir, exist_ok=True)
                save_path = os.path.join(video_dir, f"grok_video_{video_id}.mp4")

                # 保存
                await download.save_as(save_path)
                file_size = os.path.getsize(save_path)
                print(f"✅ 高清视频下载成功: {save_path} ({file_size} bytes)")
                
            except Exception as e:
                print(f"⚠️ 自动化处理过程遇到问题: {e}")
                print(f"💡 请手动处理并存放到 assets/projects/demo/videos/grok_video_{video_id}.mp4")
            
        except Exception as e:
            print(f"❌ 操作过程中发生错误: {e}")

if __name__ == "__main__":
    import sys
    import os
    
    # 动态参数支持: python tools/grok_bridge.py [图片路径/模式] [提示词/索引] [视频ID]
    arg1 = sys.argv[1] if len(sys.argv) > 1 else "img"
    
    if os.path.exists(arg1):
        # 路径模式: 直接传入图片路径
        img_path = arg1
        custom_prompt = sys.argv[2] if len(sys.argv) > 2 else "Make this image move"
        v_id = sys.argv[3] if len(sys.argv) > 3 else "99"
        print(f"🎬 运行路径模式: {img_path}")
        asyncio.run(grok_generate_video(img_path, prompt=custom_prompt, video_id=v_id))
    else:
        # 索引模式: 保持原有逻辑
        scenes = [
            {"img": "remotion-studio/public/assets/projects/demo/images/kolors_scene_01.png", "id": "01", "prompt": "A futuristic spherical robot"},
            {"img": "remotion-studio/public/assets/projects/demo/images/kolors_scene_02.png", "id": "02", "prompt": "A futuristic female warrior"},
            {"img": "remotion-studio/public/assets/projects/demo/images/kolors_scene_03.png", "id": "03", "prompt": "A young man standing in field"}
        ]
        mode = arg1 # txt 或 img
        try:
            idx = int(sys.argv[2]) if len(sys.argv) > 2 else 0
            if idx < len(scenes):
                s = scenes[idx]
                if mode == "txt":
                    print(f"🎬 开始【文生视频】场景 {s['id']}...")
                    asyncio.run(grok_generate_video(None, prompt=s['prompt'], video_id=f"{s['id']}_txt"))
                else:
                    print(f"🎬 开始【图生视频】场景 {s['id']}...")
                    asyncio.run(grok_generate_video(s['img'], prompt=s['prompt'], video_id=s['id']))
            else:
                print("❌ 索引超出范围")
        except (ValueError, IndexError):
            print("💡 使用说明:")
            print("1. 路径模式: python tools/grok_bridge.py [图片绝对路径] [提示词] [ID]")
            print("2. 索引模式: python tools/grok_bridge.py txt/img [0-2]")
