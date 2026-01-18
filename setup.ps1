# AIcut 一键环境初始化脚本 (Windows PowerShell)

$ErrorActionPreference = "Stop"

Write-Host "🚀 开始初始化 AIcut 环境..." -ForegroundColor Cyan

# 1. 检查环境变量
Write-Host "`n[1/5] 检查系统环境..." -ForegroundColor Yellow
if (!(Get-Command ffmpeg -ErrorAction SilentlyContinue)) {
    Write-Host "❌ 错误: 未找到 ffmpeg。请确保 ffmpeg 已安装并加入环境变量。" -ForegroundColor Red
    exit
}
Write-Host "✅ FFmpeg 已就绪"

# 2. 准备 .env 文件
Write-Host "`n[2/5] 配置环境变量..." -ForegroundColor Yellow
if (!(Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "✅ 已从 .env.example 创建 .env 文件"
} else {
    Write-Host "ℹ️ .env 文件已存在，跳过复制"
}

# 3. 初始化 Python 环境
Write-Host "`n[3/5] 初始化 Python 虚拟环境 (uv/pip)..." -ForegroundColor Yellow
if (Get-Command uv -ErrorAction SilentlyContinue) {
    uv venv
    & .\.venv\Scripts\Activate.ps1
    uv pip install -e .
    Write-Host "✅ 使用 uv 完成 Python 环境安装"
} else {
    python -m venv .venv
    & .\.venv\Scripts\Activate.ps1
    pip install -e .
    Write-Host "✅ 使用 pip 完成 Python 环境安装"
}

# 4. 初始化前端依赖
Write-Host "`n[4/5] 安装前端依赖 (pnpm)..." -ForegroundColor Yellow
Set-Location "AIcut-Studio"
if (Get-Command pnpm -ErrorAction SilentlyContinue) {
    pnpm install
    Write-Host "✅ 已使用 pnpm 完成前端安装"
} else {
    Write-Host "⚠️ 未找到 pnpm，尝试使用 npm (可能存在兼容性警告)..." -ForegroundColor Gray
    npm install
}
Set-Location ".."

# 5. 创建素材软链接 (关键一步)
Write-Host "`n[5/5] 创建素材软链接 (materials symlink)..." -ForegroundColor Yellow
$SourceDir = Join-Path (Get-Location) "projects\demo\assets"
$TargetDir = Join-Path (Get-Location) "AIcut-Studio\apps\web\public\materials"

# 确保目标目录的上级目录存在
$ParentDir = Split-Path $TargetDir
if (!(Test-Path $ParentDir)) {
    New-Item -ItemType Directory -Path $ParentDir -Force
}

if (Test-Path $TargetDir) {
    Write-Host "ℹ️ 软链接/目录已存在，正在重新创建..."
    Remove-Item $TargetDir -Force -Recurse
}

# 需要管理员权限或开启开发者模式
try {
    New-Item -ItemType Junction -Path $TargetDir -Value $SourceDir
    Write-Host "✅ 成功建立 Junction 链接: projects/demo/assets -> public/materials" -ForegroundColor Green
} catch {
    Write-Host "❌ 创建链接失败。请尝试以管理员身份运行 PowerShell，或手动复制 assets 到 public/materials。" -ForegroundColor Red
}

Write-Host "`n🎉 初始化完成！" -ForegroundColor Green
Write-Host "👉 运行 'npm run dev' (在 AIcut-Studio 目录) 开启 UI"
Write-Host "👉 运行 'python tools/core/ai_daemon.py' 开启 AI 后端"
