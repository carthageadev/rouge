$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.Encoding]::UTF8
[Console]::InputEncoding = [Text.Encoding]::UTF8

$src = Join-Path $PSScriptRoot 'RougeHelper.cs'
$hash = (Get-FileHash $src -Algorithm MD5).Hash.Substring(0, 10)
$dll = Join-Path $env:TEMP "RougeHelper-$hash.dll"
if (-not (Test-Path $dll)) {
  Add-Type -Path $src -ReferencedAssemblies UIAutomationClient, UIAutomationTypes, WindowsBase -OutputAssembly $dll -OutputType Library
}
Add-Type -Path $dll
[RougeHelper]::Run()
