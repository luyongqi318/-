# 本地一键启动：后台运行服务，日志写到 data/logs，默认启动后打开浏览器
param([switch]$NoBrowser)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$port = if ($env:PORT) { [int]$env:PORT } else { 3000 }
$logDir = Join-Path $root "data\logs"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

$listening = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
if ($listening) {
  Write-Host "服务已在运行：http://localhost:$port"
  if (-not $NoBrowser) { Start-Process "http://localhost:$port" }
  exit 0
}

$entry = Join-Path $root "release\app\server.js"
if (-not (Test-Path $entry)) {
  Write-Host "找不到 release\app\server.js，先执行：npm run build; npm run release" -ForegroundColor Yellow
  exit 1
}

$env:PORT = "$port"
$env:HOSTNAME = "0.0.0.0"
$env:HR_DB_PATH = Join-Path $root "data\hr.db"
$env:NODE_ENV = "production"

$outLog = Join-Path $logDir "server.log"
$errLog = Join-Path $logDir "server.err.log"

# 注意：不要在这里给子进程重定向 stdout/stderr——会让启动脚本一直挂在管道上。
# 需要日志时用 HR_LOG_TO_FILE=1。
if ($env:HR_LOG_TO_FILE -eq "1") {
  $proc = Start-Process -FilePath "node" -ArgumentList $entry -WorkingDirectory $root -WindowStyle Hidden -PassThru `
    -RedirectStandardOutput $outLog -RedirectStandardError $errLog
} else {
  $proc = Start-Process -FilePath "node" -ArgumentList $entry -WorkingDirectory $root -WindowStyle Hidden -PassThru
}

$proc.Id | Out-File -FilePath (Join-Path $root "data\server.pid") -Encoding utf8
Start-Sleep -Seconds 2

$ok = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
if ($ok) {
  Write-Host "已启动：http://localhost:$port  (PID $($proc.Id))" -ForegroundColor Green
  if (-not $NoBrowser) { Start-Process "http://localhost:$port" }
} else {
  Write-Host "启动失败，查看日志：$errLog" -ForegroundColor Red
  exit 1
}
exit 0
