# 取消开机自启
$startup = [Environment]::GetFolderPath("Startup")
$linkPath = Join-Path $startup "东锦江HR平台.lnk"
if (Test-Path $linkPath) {
  Remove-Item $linkPath -Force
  Write-Host "已取消开机自启" -ForegroundColor Green
} else {
  Write-Host "没有找到自启快捷方式，无需操作"
}
