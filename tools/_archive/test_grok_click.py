import asyncio
from playwright.async_api import async_playwright

async def test_more_button():
    async with async_playwright() as p:
        try:
            browser = await p.chromium.connect_over_cdp("http://localhost:9222")
            print("✅ 已连接到 Chrome")
        except Exception as e:
            print(f"❌ 连接失败: {e}")
            return

        context = browser.contexts[0]
        page = context.pages[0]
        
        # 按钮特征：aria-label="更多选项" 或包含 lucide-ellipsis SVG
        # 我们使用用户提供的 aria-label 和 id 特征
        selector = 'button[aria-label="更多选项"], button:has(.lucide-ellipsis)'
        
        print(f"🔍 正在寻找按钮: {selector}")
        try:
            # 1. 点击“更多选项”
            button = page.locator(selector).last
            await button.scroll_into_view_if_needed()
            await asyncio.sleep(0.5)
            
            print("🖱️ 正在点击‘更多选项’按钮...")
            await button.click()
            
            # 2. 等待菜单弹出并点击“升级视频”
            await asyncio.sleep(1.0)
            upgrade_item = page.get_by_text("升级视频")
            
            if await upgrade_item.count() > 0:
                print("🎯 发现‘升级视频’选项，正在点击...")
                await upgrade_item.first.click()
                print("✨ 点击‘升级视频’成功！请在浏览器观察 HD 处理进度。")
            else:
                print("⚠️ 未发现‘升级视频’选项，请确保菜单已正确弹出。")
                
        except Exception as e:
            print(f"❌ 操作失败: {e}")

if __name__ == "__main__":
    asyncio.run(test_more_button())
