# publish.ps1 — 一键发布到 GitHub Pages
# 前提：设置环境变量 GH_TOKEN（GitHub 经典 PAT，需 repo 与 workflow 权限）
# 用法：$env:GH_TOKEN="ghp_xxx"; powershell -ExecutionPolicy Bypass -File publish.ps1
$ErrorActionPreference = 'Stop'
if (-not $env:GH_TOKEN) { Write-Host '请先设置环境变量 GH_TOKEN'; exit 1 }
$headers = @{ Authorization = "Bearer $env:GH_TOKEN"; 'User-Agent' = 'element-price-bot'; Accept = 'application/vnd.github+json' }
$owner = (Invoke-RestMethod -Uri 'https://api.github.com/user' -Headers $headers -Method Get).login
$repo = 'element-price-table'
Write-Host "GitHub 用户: $owner"

try {
  $body = @{ name = $repo; description = '元素周期表 · 今日价格（每日自动更新）'; public = $true; has_issues = $false; has_wiki = $false } | ConvertTo-Json
  Invoke-RestMethod -Uri 'https://api.github.com/user/repos' -Headers $headers -Method Post -Body $body -ContentType 'application/json' | Out-Null
  Write-Host "仓库已创建: $owner/$repo"
} catch { Write-Host "创建仓库提示(可能已存在): $($_.Exception.Message)" }

Set-Location $PSScriptRoot
git remote remove origin 2>$null
git remote add origin "https://x-access-token:$env:GH_TOKEN@github.com/$owner/$repo.git"
git push -u origin main
git remote remove origin
Write-Host '代码已推送（已移除含 token 的远程地址）'

try {
  $pagesBody = @{ source = @{ branch = 'main'; path = '/' } } | ConvertTo-Json -Depth 3
  Invoke-RestMethod -Uri "https://api.github.com/repos/$owner/$repo/pages" -Headers $headers -Method Post -Body $pagesBody -ContentType 'application/json' | Out-Null
  Write-Host 'GitHub Pages 已启用'
} catch { Write-Host "启用 Pages 提示: $($_.Exception.Message)" }

Write-Host ""
Write-Host "站点地址: https://$owner.github.io/$repo/"
Write-Host "首次访问可能需要等 1-2 分钟；之后每日 08:15/20:15（北京时间）自动更新价格。"
