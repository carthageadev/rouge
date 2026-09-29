$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.Encoding]::UTF8
[Console]::InputEncoding = [Text.Encoding]::UTF8

$src = Join-Path $PSScriptRoot 'RougeHelper.cs'
$md5 = [Security.Cryptography.MD5]::Create()
$hash = -join ($md5.ComputeHash([IO.File]::ReadAllBytes($src)) | ForEach-Object { $_.ToString('X2') })
$hash = $hash.Substring(0, 10)
$dll = Join-Path $env:TEMP "RougeHelper-$hash.dll"
if (-not (Test-Path $dll)) {
  Add-Type -Path $src -ReferencedAssemblies UIAutomationClient, UIAutomationTypes, WindowsBase -OutputAssembly $dll -OutputType Library
}
Add-Type -Path $dll
[RougeHelper]::Run()
