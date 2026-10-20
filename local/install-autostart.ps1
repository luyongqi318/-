# 开机自启：在当前用户的「启动」文件夹里放一个快捷方式（不需要管理员权限）
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$startScript = Join-Path $root "local\start.ps1"

$startup = [Environment]::GetFolderPath("Startup")
$linkPath = Join-Path $startup "东锦江HR平台.lnk"

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($linkPath)
$shortcut.TargetPath = "pwsh.exe"
$shortcut.Arguments = "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$startScript`""
$shortcut.WorkingDirectory = $root
$shortcut.Description = "东锦江希尔顿逸林酒店 HR 平台"
$shortcut.Save()

Write-Host "已添加开机自启：$linkPath" -ForegroundColor Green
Write-Host "下次登录 Windows 会自动启动服务并打开浏览器。"
