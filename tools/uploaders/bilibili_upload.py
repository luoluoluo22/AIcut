import asyncio
import os
from playwright.async_api import async_playwright
import argparse

# 视频发布配置
VIDEO_PATH = r"f:\桌面\开发\AIcut\remotion-studio\out\product_promo_v7_final.mp4"
COVER_PATH = r"f:\桌面\开发\AIcut\remotion-studio\public\assets\projects\product_promo\v6_promo_cover16x9.png"
TITLE = "AIcut x Grok 3：一句话生成电影级短片 | 全自动内容引擎实战复盘"
TAGS = ["AI", "人工智能", "自动化", "Grok", "Remotion", "编程", "开源"]
DESC = """AIcut 迎来史诗级更新！深度集成 Grok 3 文生视频能力。
在 Antigravity IDE 中，由 Gemini 3 驱动，全自动开启调试模式浏览器，Python + JS 脚本自动化实现从创意到剪辑的全链路闭环。
本视频完整复盘了 2026 新年快乐短片的诞生成果。
项目已开源在 Github，想要地址的请一键三连，私信博主，并附上关键词：AIcut"""

async def upload_bilibili():
    async with async_playwright() as p:
        try:
           # 尝试连接当前已打开的调试浏览器 (就像 Grok 脚本那样)
            browser = await p.chromium.connect_over_cdp("http://localhost:9222")
            print("✅ 已成功连接到 Chrome 调试端口")
        except Exception as e:
            print(f"❌ 无法连接到 Chrome: {e}")
            print("请确保 Chrome 已使用 --remote-debugging-port=9222 启动")
            return

        context = browser.contexts[0]
        page = context.pages[0] # 使用当前标签页或者新建一个

        # 1. 导航到投稿页
        print("🚀 正在跳转到 Bilibili 投稿页...")
        await page.goto("https://member.bilibili.com/platform/upload/video/frame")
        await page.wait_for_load_state("domcontentloaded")
        
        # 2. 上传视频 (跳过大文件)
        print("⚠️ 检测到视频文件超过 50MB (Playwright CDP 限制)，请手动拖入视频文件！")
        print(f"📁 视频路径: {VIDEO_PATH}")
        # video_input = page.locator('input[type="file"]').first 
        # await video_input.set_input_files(VIDEO_PATH)

        # 3. 填写标题
        print(f"📝 正在填写标题... {TITLE}")
        title_input = page.locator('input.input-val[placeholder*="标题"]')
        await title_input.click()
        await title_input.fill(TITLE)
        
        # 4. 上传封面 (关键步骤)
        print(f"🖼️ 正在上传封面: {os.path.basename(COVER_PATH)}")
        # 很多时候需要先点击“设置封面”才能激活 input
        cover_trigger = page.locator('div.cover-upload-btn, div.cover-clk') # 尝试定位封面区域
        if await cover_trigger.count() > 0:
             await cover_trigger.first.click()
             await asyncio.sleep(1) # 等待模态框

        # 在模态框或页面中寻找图片上传 input
        # 策略：找 accept 包含 image 的 input
        image_input = page.locator('input[type="file"][accept*="image"]')
        if await image_input.count() > 0:
            await image_input.set_input_files(COVER_PATH)
            
            # 处理封面裁剪确认 (如果有)
            confirm_btn = page.locator('div.cropper-confirm-btn, div.modal-footer button.primary')
            try:
                await confirm_btn.wait_for(timeout=5000)
                await confirm_btn.click()
                print("✅ 封面裁剪已确认")
            except:
                print("ℹ️ 无需裁剪或自动通过")
        else:
            print("❌ 未找到封面上传入口，跳过封面上传")

        # 5. 选择分区 (科技 -> 人工智能)
        print("🗂️ 正在选择分区: 科技 -> 人工智能")
        type_select = page.locator('.bcc-select') # 分区下拉框
        if await type_select.count() > 0:
            await type_select.first.click()
            await asyncio.sleep(0.5)
            # 点击“科技”
            await page.get_by_text("科技", exact=True).click() 
            await asyncio.sleep(0.5)
            # 点击“人工智能”
            await page.get_by_text("人工智能").click()
        
        # 6. 填写标签
        print("🏷️ 正在添加标签...")
        tag_input = page.locator('input.input-val[placeholder*="标签"]')
        await tag_input.click()
        for tag in TAGS:
            await tag_input.fill(tag)
            await page.keyboard.press("Enter")
            await asyncio.sleep(0.2)

        # 7. 填写简介
        print("📄 正在填写简介...")
        desc_editor = page.locator('div.editor-content-input') # 简介编辑框通常是 contenteditable div
        if await desc_editor.count() == 0:
             desc_editor = page.locator('textarea.input-val[placeholder*="简介"]') # 或者是 textarea

        if await desc_editor.count() > 0:
            await desc_editor.first.click()
            await desc_editor.first.fill(DESC)
        
        print("✅ 所有信息填写完毕！")
        print("⏳ 请在该脚本结束后，人工检查并点击【立即投稿】按钮。")

if __name__ == "__main__":
    asyncio.run(upload_bilibili())
