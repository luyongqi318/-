# 本地停止服务
$ErrorActionPreference = "SilentlyContinue"
$root = Split-Path -Parent $PSScriptRoot
$port = if ($env:PORT) { [int]$env:PORT } else { 3000 }

$pidFile = Join-Path $root "data\server.pid"
if (Test-Path $pidFile) {
  $savedPid = (Get-Content $pidFile -Raw).Trim()
  if ($savedPid) {
    Stop-Process -Id ([int]$savedPid) -Force -ErrorAction SilentlyContinue
  }
  Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
}

$conn = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
foreach ($item in $conn) {
  Stop-Process -Id $item.OwningProcess -Force -ErrorAction SilentlyContinue
}

if (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue) {
  Write-Host "端口 $port 仍被占用，可能需要在任务管理器结束 node 进程" -ForegroundColor Yellow
} else {
  Write-Host "已停止（端口 $port 已释放）" -ForegroundColor Green
}
