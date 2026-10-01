<#
 Book Buddy by VPD - commit this folder and push it to GitHub.

   powershell -ExecutionPolicy Bypass -File scripts\push-github.ps1
   (or double-click scripts\push-github.cmd)

 Uses YOUR Git login on this computer. If Git needs to sign in, a GitHub
 browser window opens - sign in as the account that owns the repository.

 Safety:
   - .gitignore keeps node_modules, build output and every .env file out
     (only *.env.example templates are committed); the script double-checks
     and refuses to push if any real .env file is staged.
   - It never force-pushes. If the GitHub repo already has commits this
     folder doesn't know about, it stops and says so.
#>
param(
    [string]$Remote = 'https://github.com/book-buddy007/bookbuddy.git',
    [string]$Branch = 'main',
    [string]$LogFile = ''
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $Root
if ($LogFile) {
    if (-not [System.IO.Path]::IsPathRooted($LogFile)) { $LogFile = Join-Path $Root $LogFile }
    Start-Transcript -Path $LogFile -Force | Out-Null
}

function Step([string]$m) { Write-Host "`n==> $m" -ForegroundColor Cyan }
function Ok([string]$m)   { Write-Host "    $m" -ForegroundColor Green }

# Every git call: trust this folder even on an external/other-owner drive
# ("dubious ownership"), and silence per-file line-ending warnings.
$GitPrefix = @('-c', ('safe.directory=' + ($Root -replace '\\', '/')), '-c', 'core.safecrlf=false')

function Run([string]$Exe, [string[]]$Argv, [switch]$AllowFail) {
    if ($Exe -eq 'git') { $Argv = $GitPrefix + $Argv }
    $old = $ErrorActionPreference; $ErrorActionPreference = 'Continue'
    try {
        & $Exe @Argv 2>&1 | ForEach-Object { Write-Host "    $_" }
        $code = $LASTEXITCODE
    } finally { $ErrorActionPreference = $old }
    if ($code -ne 0 -and -not $AllowFail) { throw "'$Exe $($Argv -join ' ')' failed (exit $code)" }
    return $code
}

function Capture([string]$Exe, [string[]]$Argv) {
    if ($Exe -eq 'git') { $Argv = $GitPrefix + $Argv }
    $old = $ErrorActionPreference; $ErrorActionPreference = 'Continue'
    try { $out = & $Exe @Argv 2>$null } finally { $ErrorActionPreference = $old }
    return $out
}

$Failed = $false
try {
    Step 'Checking Git'
    if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
        throw 'Git is not installed. Install it from https://git-scm.com/download/win and run this again.'
    }
    Ok ((Capture 'git' @('--version')) -join ' ')

    if (-not (Test-Path -LiteralPath '.git')) {
        Run 'git' @('init') | Out-Null
        Ok 'new repository created'
    }

    # Commit identity: keep the user's own Git identity if one is configured.
    if (-not (Capture 'git' @('config', 'user.name')))  { Run 'git' @('config', 'user.name', 'Book Buddy by VPD') | Out-Null }
    if (-not (Capture 'git' @('config', 'user.email'))) { Run 'git' @('config', 'user.email', 'braj.kt2050@gmail.com') | Out-Null }

    Step 'Staging files'
    Run 'git' @('add', '-A') | Out-Null
    $staged = @(Capture 'git' @('diff', '--cached', '--name-only'))
    $secret = @($staged | Where-Object { $_ -match '(^|/)\.env($|\.)' -and $_ -notmatch '\.env\.example$' })
    if ($secret.Count -gt 0) {
        Run 'git' @('reset') -AllowFail | Out-Null
        throw "Refusing to continue - real environment files were staged: $($secret -join ', ')"
    }
    Ok "$($staged.Count) files staged (no .env secrets)"

    $hasHead = (Run 'git' @('rev-parse', '--verify', 'HEAD') -AllowFail) -eq 0
    if ($staged.Count -gt 0) {
        $msg = if ($hasHead) { 'Update Book Buddy by VPD' } else { 'Book Buddy by VPD - initial commit' }
        Run 'git' @('commit', '-q', '-m', $msg) | Out-Null
        Ok "committed: $msg"
    } elseif (-not $hasHead) {
        throw 'Nothing to commit.'
    } else {
        Ok 'nothing new to commit'
    }
    Run 'git' @('branch', '-M', $Branch) | Out-Null

    Step "Connecting to $Remote"
    $remotes = @(Capture 'git' @('remote'))
    if ($remotes -contains 'origin') { Run 'git' @('remote', 'set-url', 'origin', $Remote) | Out-Null }
    else { Run 'git' @('remote', 'add', 'origin', $Remote) | Out-Null }

    # May open a GitHub sign-in window the first time.
    Run 'git' @('fetch', 'origin') | Out-Null
    $remoteHead = Capture 'git' @('rev-parse', '--verify', '-q', "origin/$Branch")
    if ($remoteHead) {
        $isAncestor = (Run 'git' @('merge-base', '--is-ancestor', "origin/$Branch", 'HEAD') -AllowFail) -eq 0
        if (-not $isAncestor) {
            Write-Host ''
            Write-Host "    The GitHub repo already has commits on '$Branch' that are not in this folder:" -ForegroundColor Yellow
            Run 'git' @('log', '--oneline', '-5', "origin/$Branch") -AllowFail | Out-Null
            throw "Not pushing, so nothing on GitHub is overwritten. Tell Claude what the repo contains and how to combine them."
        }
    }

    Step 'Pushing'
    Run 'git' @('push', '-u', 'origin', $Branch) | Out-Null
    Ok "pushed to $Remote ($Branch)"
    Run 'git' @('log', '--oneline', '-1') | Out-Null
} catch {
    $Failed = $true
    Write-Host ''
    Write-Host "FAILED: $($_.Exception.Message)" -ForegroundColor Red
} finally {
    if ($LogFile) { Stop-Transcript | Out-Null }
}
if ($Failed) { exit 1 }
