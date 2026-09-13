$ErrorActionPreference = 'Stop'
$base = if ($env:BASE_URL) { $env:BASE_URL } else { 'http://localhost:3000' }
$health = Invoke-WebRequest "$base/api/health" -UseBasicParsing
if ($health.StatusCode -ne 200) { throw 'Health check failed' }
$unauthorized = $false
try { Invoke-WebRequest "$base/api/notes" -UseBasicParsing | Out-Null } catch { $unauthorized = $_.Exception.Response.StatusCode.value__ -eq 401 }
if (-not $unauthorized) { throw 'Unauthorized notes request was not rejected' }
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$login = Invoke-WebRequest "$base/api/auth/login" -Method Post -ContentType 'application/json' -Body '{"username":"admin","password":"admin123"}' -WebSession $session -UseBasicParsing
if ($login.StatusCode -ne 200) { throw 'Login failed' }
$notes = Invoke-WebRequest "$base/api/notes" -WebSession $session -UseBasicParsing
if ($notes.StatusCode -ne 200) { throw 'Notes API failed' }
Write-Output "Smoke test passed: health=$($health.StatusCode), login=$($login.StatusCode), notes=$($notes.StatusCode)"
