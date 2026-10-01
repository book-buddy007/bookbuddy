<#
============================================================================
 Book Buddy by VPD - clean slate
============================================================================
 Turns this folder into a fresh, standalone Book Buddy app:

   1. Moves every old-app leftover (history/audit docs, scratch + mock files,
      old migrations, old .env files) into a backup ZIP next to the project
      folder, then removes them from the project.
   2. Deletes build output (.next, backend\dist, *.tsbuildinfo).
   3. Writes new .env files with freshly generated secrets.
   4. Removes this folder's old Docker containers + volumes (old MySQL/Redis)
      and any previous Book Buddy containers + volumes, then starts fresh
      Postgres, Redis, Qdrant and MinIO containers.
   5. Optionally drops the old local dev database (pdlms_gate) from the
      Postgres it used to live in.
   6. Creates the schema, reference data and ONE super-admin account.

 Production is never touched.

 Run from anywhere:
   powershell -ExecutionPolicy Bypass -File scripts\clean-slate.ps1
 Add -Yes to skip the confirmation prompts, -AdminEmail you@x.com to skip the
 email prompt, and -LogFile path to keep a transcript.

 Needs: Docker Desktop running, Node 20+, and `npm install` already done in
 backend\ (Prisma and ts-node come from there).
============================================================================
#>
param([switch]$Yes, [string]$AdminEmail = '', [string]$LogFile = '')

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $Root
if ($LogFile) {
    if (-not [System.IO.Path]::IsPathRooted($LogFile)) { $LogFile = Join-Path $Root $LogFile }
    Start-Transcript -Path $LogFile -Force | Out-Null
}
$Failed = $false
try {

$ComposeProject = 'book-buddy-vpd'
$InitMigration  = '20261001000000_book_buddy_init'

function Step([string]$m) { Write-Host "`n==> $m" -ForegroundColor Cyan }
function Ok([string]$m)   { Write-Host "    $m" -ForegroundColor Green }
function Note([string]$m) { Write-Host "    $m" -ForegroundColor DarkGray }
function Warn([string]$m) { Write-Host "    $m" -ForegroundColor Yellow }

# Run a native command without Windows PowerShell turning stderr into a terminating error.
function Run([string]$Exe, [string[]]$Argv, [switch]$AllowFail, [switch]$Quiet) {
    $old = $ErrorActionPreference; $ErrorActionPreference = 'Continue'
    try {
        if ($Quiet) { & $Exe @Argv 2>&1 | Out-Null }
        else { & $Exe @Argv 2>&1 | ForEach-Object { Write-Host "    $_" } }
        $code = $LASTEXITCODE
    } finally { $ErrorActionPreference = $old }
    if ($code -ne 0 -and -not $AllowFail) { throw "'$Exe $($Argv -join ' ')' failed (exit $code)" }
    return $code
}

function Capture([string]$Exe, [string[]]$Argv) {
    $old = $ErrorActionPreference; $ErrorActionPreference = 'Continue'
    try { $out = & $Exe @Argv 2>$null } finally { $ErrorActionPreference = $old }
    return $out
}

function New-Hex([int]$Bytes = 32) {
    $b = New-Object byte[] $Bytes
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $rng.GetBytes($b); $rng.Dispose()
    return (($b | ForEach-Object { $_.ToString('x2') }) -join '')
}

function Read-EnvValue([string]$File, [string]$Key) {
    if (-not (Test-Path -LiteralPath $File)) { return $null }
    foreach ($line in [System.IO.File]::ReadAllLines((Resolve-Path -LiteralPath $File).Path)) {
        if ($line -match "^\s*$Key\s*=\s*(.*)$") { return $Matches[1].Trim().Trim('"').Trim("'") }
    }
    return $null
}

$Utf8 = New-Object System.Text.UTF8Encoding($false)
function Write-Text([string]$RelPath, [string]$Text) {
    [System.IO.File]::WriteAllText((Join-Path $Root $RelPath), $Text, $Utf8)
}

# -- 0. Preconditions + confirmation -----------------------------------------
Step 'Checking prerequisites'
foreach ($cmd in @('docker', 'node')) {
    if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) { throw "'$cmd' was not found on PATH." }
}
if ((Run 'docker' @('info') -AllowFail -Quiet) -ne 0) { throw 'Docker is not running. Start Docker Desktop and re-run.' }
if (-not (Test-Path -LiteralPath 'backend\node_modules\prisma\build\index.js')) {
    throw "backend\node_modules is missing. Run:  cd backend; npm install --legacy-peer-deps"
}
foreach ($t in @('.env.example', 'backend\.env.example', "backend\prisma\migrations\$InitMigration\migration.sql")) {
    if (-not (Test-Path -LiteralPath $t)) { throw "Missing $t - the Book Buddy clean-slate files are not all in place." }
}
Ok 'Docker, Node and backend dependencies found'

Write-Host ''
Write-Host '  This will PERMANENTLY reset your LOCAL Book Buddy environment:' -ForegroundColor Yellow
Write-Host '   - remove old docs, audits, scratch/mock files, old migrations and .env files'
Write-Host '     (a backup ZIP is written next to the project folder first)'
Write-Host '   - delete this project''s Docker containers AND their data volumes'
Write-Host '   - create an empty database with one super-admin account'
Write-Host '  Production is not touched.'
if (-not $Yes) {
    $answer = Read-Host "`n  Type WIPE to continue"
    if ($answer -ne 'WIPE') { Write-Host 'Cancelled - nothing was changed.'; exit 1 }
}

$AdminEmail = $AdminEmail.Trim().ToLower()
while ($AdminEmail -notmatch '^[^@\s]+@[^@\s]+\.[^@\s]+$') {
    $AdminEmail = (Read-Host '  Super-admin email for the new app').Trim().ToLower()
}

# Remember where the old local dev DB lived before its .env file is moved away.
# On a re-run .env.local already points at the new database, so look in the
# newest earlier backup ZIP for the original one.
$OldDbUrl = Read-EnvValue '.env.local' 'DATABASE_URL'
if (-not $OldDbUrl -or $OldDbUrl -match '@(127\.0\.0\.1|localhost):5440/') {
    $OldDbUrl = $null
    try {
        Add-Type -AssemblyName System.IO.Compression.FileSystem
        $zips = @(Get-ChildItem -LiteralPath (Split-Path -Parent $Root) -Filter ("{0}_before-clean-slate_*.zip" -f (Split-Path -Leaf $Root)) -ErrorAction SilentlyContinue | Sort-Object Name -Descending)
        foreach ($z in $zips) {
            $zip = [System.IO.Compression.ZipFile]::OpenRead($z.FullName)
            try {
                $entry = $zip.Entries | Where-Object { $_.FullName -eq '.env.local' } | Select-Object -First 1
                if ($entry) {
                    $reader = New-Object System.IO.StreamReader($entry.Open())
                    $content = $reader.ReadToEnd(); $reader.Close()
                    if ($content -match '(?m)^\s*DATABASE_URL\s*=\s*(.+)$') {
                        $candidate = $Matches[1].Trim().Trim('"').Trim("'")
                        if ($candidate -notmatch '@(127\.0\.0\.1|localhost):5440/') { $OldDbUrl = $candidate }
                    }
                }
            } finally { $zip.Dispose() }
            if ($OldDbUrl) { break }
        }
    } catch { $OldDbUrl = $null }
}

# -- 1. Back up and remove old-app leftovers ---------------------------------
Step 'Backing up and removing old-app files'
$Stamp     = Get-Date -Format 'yyyyMMdd_HHmmss'
$BackupDir = Join-Path (Split-Path -Parent $Root) ("{0}_before-clean-slate_{1}" -f (Split-Path -Leaf $Root), $Stamp)

$Remove = @(
    # history, audits, stale guides
    'audit', 'docs\context', 'strix_runs',
    'POSTGRES_MIGRATION_PLAN.md', 'LANDING_PAGE_TRANSFORMATION_COMPLETE.md',
    'TECHNICAL_DOCUMENTATION.md', 'COOLIFY_DEPLOYMENT.md',
    'PDLMS Reader - Responsive.dc.html', 'mobile\ROADMAP.md',
    'prisma\rejected', 'prisma\migrations',
    'docker', '.env.docker', '.env.local.bak-linktest',
    'shared\design\indic\indic-app.pdlms.css', 'shared\design\indic\indic-favicon.pdlms.svg',
    'scripts\postgres-migration', 'scripts\reconcile-with-vidyaverse.ts',
    'scripts\docker-setup.ps1', 'scripts\Start-Services.ps1', 'scripts\start_services.bat',
    'scripts\backfill-slugs.ts', 'scripts\drop-tenant-sub.js', 'scripts\seed-plans.js',
    'scripts\finish-book-buddy-rename.ps1', 'scripts\rename-databases.sql',
    'scripts\create-placeholder-covers.js', 'scripts\create-placeholder-jpgs.js',
    'backend\scripts\MIGRATION_COMMANDS.txt', 'backend\scripts\VALIDATION_CHECKLIST.txt',
    'backend\scripts\migration-guide.sh', 'backend\scripts\cleanup-old-schema.sql',
    'backend\scripts\migrate-to-multi-tenant.ts', 'backend\scripts\migrate-passwords.ts',
    'backend\scripts\backfill-tenant-sentinel.ts', 'backend\scripts\audit-quiz-item-language.ts',
    'backend\scripts\phase4-gold-set.example.json', 'backend\scripts\phase4-sanskrit-eval.ts',
    'backend\scripts\recover-orphaned-covers.ts', 'backend\scripts\fix-urls.ts',
    # scratch, test accounts, mock data
    'backend\check_books.ts', 'backend\check-db.js', 'backend\check.js', 'backend\fix-db.js',
    'backend\query.js', 'backend\scratch.js', 'backend\scratch3.js', 'backend\seed-genres.js',
    'backend\tmp_seed_genres.ts', 'backend\test_db.js', 'backend\test-cat.js',
    'backend\test-cloudflare-wiring.mjs', 'backend\test-db.js', 'backend\test-enum.ts',
    'backend\test-qdrant.js', 'backend\test-qdrant2.js', 'backend\test-qdrant3.js',
    'backend\test-query-all.mjs', 'backend\test-query.mjs', 'backend\test-service.js',
    'backend\test-towards.js', 'backend\test.ts', 'backend\test2.ts', 'backend\test3.ts',
    'backend\scripts\check-api.js', 'backend\scripts\check-covers.ts',
    'backend\scripts\check-super-admin.ts', 'backend\scripts\cleanup-users.ts',
    'backend\scripts\create-super-admin.ts', 'backend\scripts\create-test-accounts.ts',
    'backend\scripts\fix-test-users.ts', 'backend\scripts\seed-test-users.ts',
    'backend\scripts\verify-test-accounts.ts',
    'backend\src\scripts', 'backend\src\email\test-email.ts',
    'backend\prisma\create-student.ts', 'backend\prisma\seed-dev-users.ts',
    'backend\test\eval', 'data',
    'public\test-audio.html', 'public\books', 'public\audio',
    # old environment files (regenerated below)
    '.env', '.env.local', 'backend\.env'
)
if (Test-Path -LiteralPath 'backend\prisma\migrations') {
    foreach ($dir in @(Get-ChildItem -LiteralPath 'backend\prisma\migrations' -Directory)) {
        if ($dir.Name -ne $InitMigration) { $Remove += "backend\prisma\migrations\$($dir.Name)" }
    }
}

$moved = 0
foreach ($rel in $Remove) {
    if (Test-Path -LiteralPath $rel) {
        $dest = Join-Path $BackupDir $rel
        New-Item -ItemType Directory -Force -Path (Split-Path -Parent $dest) | Out-Null
        Move-Item -LiteralPath $rel -Destination $dest -Force
        $moved++
    }
}
if ($moved -gt 0) {
    try {
        Add-Type -AssemblyName System.IO.Compression.FileSystem
        [System.IO.Compression.ZipFile]::CreateFromDirectory($BackupDir, "$BackupDir.zip")
        Remove-Item -LiteralPath $BackupDir -Recurse -Force
        Ok "$moved items removed - backup: $BackupDir.zip"
    } catch {
        Warn "Could not zip the backup ($($_.Exception.Message)); it is kept as a folder: $BackupDir"
    }
} else {
    Note 'Nothing left to remove (already clean).'
}

foreach ($d in @('.next', 'backend\.next', 'backend\dist', 'tsconfig.tsbuildinfo', 'backend\tsconfig.build.tsbuildinfo')) {
    if (Test-Path -LiteralPath $d) { Remove-Item -LiteralPath $d -Recurse -Force; Note "deleted $d" }
}

# -- 2. New .env files with fresh secrets ------------------------------------
Step 'Writing new .env files with fresh secrets'
$PgPassword    = New-Hex 24
$MinioPassword = New-Hex 24
$AdminPassword = 'Bb!' + (New-Hex 10) + '9'
$Tokens = [ordered]@{
    '__POSTGRES_PASSWORD__'  = $PgPassword
    '__MINIO_PASSWORD__'     = $MinioPassword
    '__BETTER_AUTH_SECRET__' = (New-Hex 32)
    '__JWT_SECRET__'         = (New-Hex 32)
    '__JWT_REFRESH_SECRET__' = (New-Hex 32)
    '__OTP_HMAC_SECRET__'    = (New-Hex 32)
    '__DRM_KEY__'            = (New-Hex 32)
    '__SUPER_ADMIN_EMAIL__'  = $AdminEmail
}
foreach ($pair in @(@('.env.example', '.env.local'), @('backend\.env.example', 'backend\.env'))) {
    $text = [System.IO.File]::ReadAllText((Join-Path $Root $pair[0]), $Utf8)
    foreach ($k in $Tokens.Keys) { $text = $text.Replace($k, $Tokens[$k]) }
    if ($text -cmatch '__[A-Z_]+__') { throw "Unfilled placeholder $($Matches[0]) in $($pair[0])" }
    Write-Text $pair[1] $text
    Ok "$($pair[1])"
}
Write-Text '.env' ("# Docker service passwords for docker-compose.yml - generated by scripts/clean-slate.ps1`r`n" +
                   "POSTGRES_PASSWORD=$PgPassword`r`nMINIO_ROOT_PASSWORD=$MinioPassword`r`n")
Ok '.env (Docker)'

# -- 3. Docker: remove old containers/volumes, start fresh services ----------
Step 'Resetting Docker services'
$projects = @()
$json = Capture 'docker' @('compose', 'ls', '--all', '--format', 'json')
if ($json) {
    try { $parsed = ($json -join '') | ConvertFrom-Json; $projects = @($parsed | ForEach-Object { $_ }) } catch { $projects = @() }
}
foreach ($p in $projects) {
    if ($p.Name -ne $ComposeProject -and ("$($p.ConfigFiles)" -like "$Root*")) {
        Note "removing old compose project '$($p.Name)' (containers + volumes)"
        Run 'docker' @('compose', '-p', $p.Name, 'down', '-v', '--remove-orphans') -AllowFail | Out-Null
    }
}
foreach ($c in @('pdlms_mysql', 'pdlms_redis', 'book_buddy_mysql', 'book_buddy_redis')) {
    Run 'docker' @('rm', '-f', $c) -AllowFail -Quiet | Out-Null
}
Run 'docker' @('compose', '-p', $ComposeProject, 'down', '-v', '--remove-orphans') -AllowFail | Out-Null

# Refuse to fight another app for a port - list the culprit instead.
$busy = @()
foreach ($port in @('5440', '6381', '6335', '9000', '9001')) {
    foreach ($name in @(Capture 'docker' @('ps', '--filter', "publish=$port", '--format', '{{.Names}}'))) {
        if ($name) { $busy += "port $port is used by container '$name'" }
    }
}
if ($busy.Count -gt 0) {
    $busy | ForEach-Object { Warn $_ }
    throw 'Stop the container(s) above (docker stop <name>) and re-run this script.'
}
Run 'docker' @('compose', '-p', $ComposeProject, 'up', '-d', 'postgres', 'redis', 'qdrant', 'minio') | Out-Null

Note 'waiting for Postgres...'
$ready = $false
for ($i = 0; $i -lt 60; $i++) {
    if ((Run 'docker' @('compose', '-p', $ComposeProject, 'exec', '-T', 'postgres', 'pg_isready', '-U', 'bookbuddy', '-d', 'book_buddy') -AllowFail -Quiet) -eq 0) { $ready = $true; break }
    Start-Sleep -Seconds 2
}
if (-not $ready) { throw 'Postgres did not become ready within 2 minutes (docker compose logs postgres).' }
Ok 'Postgres ready on localhost:5440'
$env:S3_ENDPOINT          = 'http://localhost:9000'
$env:S3_REGION            = 'us-east-1'
$env:S3_ACCESS_KEY_ID     = 'bookbuddy'
$env:S3_SECRET_ACCESS_KEY = $MinioPassword
$env:S3_BUCKET_NAME       = 'book-buddy-media'
Push-Location -LiteralPath (Join-Path $Root 'backend')
try { Run 'node' @('scripts/init-storage.js') | Out-Null }
finally {
    Pop-Location
    foreach ($v in @('S3_ENDPOINT', 'S3_REGION', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY', 'S3_BUCKET_NAME')) { Remove-Item -Path "Env:$v" -ErrorAction SilentlyContinue }
}
Ok 'MinIO ready on localhost:9000 (bucket book-buddy-media), Redis on 6381, Qdrant on 6335'

# -- 4. Old local dev database -----------------------------------------------
Step 'Old local dev database'
if ($OldDbUrl -and $OldDbUrl -match '^postgres(ql)?://([^:/@]+)(:[^@]*)?@(127\.0\.0\.1|localhost):(\d+)/([^?\s]+)') {
    $oldUser = $Matches[2]; $oldPort = $Matches[5]; $oldDb = $Matches[6]
    if ($oldDb -match '^(pdlms|book_buddy)[a-z0-9_]*$' -and $oldPort -ne '5440') {
        $container = @(Capture 'docker' @('ps', '--filter', "publish=$oldPort", '--format', '{{.Names}}')) | Select-Object -First 1
        if ($container) {
            $drop = $Yes
            if (-not $Yes) {
                $a = Read-Host "  Drop old database '$oldDb' from container '$container' (port $oldPort)? Other databases there are not touched. [y/N]"
                $drop = ($a -eq 'y' -or $a -eq 'Y')
            }
            if ($drop) {
                $code = Run 'docker' @('exec', $container, 'psql', '-U', $oldUser, '-d', 'postgres', '-c', "DROP DATABASE IF EXISTS $oldDb WITH (FORCE);") -AllowFail
                if ($code -eq 0) { Ok "dropped $oldDb" } else { Warn "could not drop $oldDb - remove it manually if you want." }
            } else { Note "kept $oldDb" }
        } else { Note "no running container on port $oldPort - old database '$oldDb' left as is." }
    } else { Note 'no old Book Buddy/PDLMS database found in the previous .env.local.' }
} else { Note 'no previous local database URL found.' }

# -- 5. Schema + seed --------------------------------------------------------
Step 'Creating schema, reference data and super admin'
$env:DATABASE_URL             = "postgresql://bookbuddy:$PgPassword@127.0.0.1:5440/book_buddy"
$env:NODE_ENV                 = 'development'
$env:ALLOW_SEED               = '1'
$env:SEED_SUPERADMIN_EMAIL    = $AdminEmail
$env:SEED_SUPERADMIN_PASSWORD = $AdminPassword
Push-Location -LiteralPath (Join-Path $Root 'backend')
try {
    # Call the Prisma CLI through node directly: npm's npx.ps1 shim re-parses its own
    # invocation line and mangles arguments when invoked from a script.
    Run 'node' @('node_modules/prisma/build/index.js', 'migrate', 'reset', '--force', '--skip-seed') | Out-Null
    # Seed directly with the local ts-node (not on PATH when Prisma spawns it).
    Run 'node' @('node_modules/ts-node/dist/bin.js', '--transpile-only', 'prisma/seed.ts') | Out-Null
} finally {
    Pop-Location
    foreach ($v in @('ALLOW_SEED', 'SEED_SUPERADMIN_EMAIL', 'SEED_SUPERADMIN_PASSWORD', 'DATABASE_URL', 'NODE_ENV')) {
        Remove-Item -Path "Env:$v" -ErrorAction SilentlyContinue
    }
}
Ok 'database ready'

# -- Done --------------------------------------------------------------------
Write-Host "`n============================================================" -ForegroundColor Green
Write-Host ' Book Buddy by VPD is on a clean slate.' -ForegroundColor Green
Write-Host '============================================================' -ForegroundColor Green
Write-Host "  Super admin : $AdminEmail"
Write-Host "  Password   : $AdminPassword   <-- shown once, save it now" -ForegroundColor Yellow
Write-Host '  Start      : pnpm dev    ->  http://localhost:3000/login'
Write-Host '  MinIO      : http://localhost:9001  (user: bookbuddy, password: MINIO_ROOT_PASSWORD in .env)'
if ($moved -gt 0) { Write-Host "  Backup     : $BackupDir.zip" }
Write-Host ''

} catch {
    $Failed = $true
    Write-Host ''
    Write-Host "FAILED: $($_.Exception.Message)" -ForegroundColor Red
} finally {
    if ($LogFile) { Stop-Transcript | Out-Null }
}
if ($Failed) { exit 1 }
