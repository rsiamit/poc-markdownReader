#Requires -Version 7
<#
.SYNOPSIS
    Build, start, and verify the Markdown Editor POC via Docker.

.PARAMETER Mode
    docker  — build image and run via docker compose (default)
    local   — run server + web dev servers directly with npm (requires Node 20)
    stop    — stop and remove running containers
    logs    — tail container logs

.PARAMETER NoBrowser
    Skip opening the browser automatically.

.PARAMETER Follow
    Keep the script running and stream container logs after the health check passes.

.EXAMPLE
    .\dev.ps1                   # Docker mode, opens browser when ready
    .\dev.ps1 -Mode local       # Local npm dev servers
    .\dev.ps1 -Mode stop        # Stop containers
    .\dev.ps1 -Follow           # Docker + stream logs
#>
param(
    [ValidateSet("docker", "local", "stop", "logs")]
    [string]$Mode = "docker",

    [switch]$NoBrowser,
    [switch]$Follow
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# ── Colours ─────────────────────────────────────────────────────────────────
function Write-Step  ([string]$msg) { Write-Host "  --> $msg" -ForegroundColor Cyan }
function Write-Ok    ([string]$msg) { Write-Host "  [OK] $msg" -ForegroundColor Green }
function Write-Fail  ([string]$msg) { Write-Host "  [FAIL] $msg" -ForegroundColor Red }
function Write-Info  ([string]$msg) { Write-Host "  $msg" -ForegroundColor Gray }
function Write-Banner([string]$msg) {
    Write-Host ""
    Write-Host "  $msg" -ForegroundColor Yellow
    Write-Host "  $("-" * $msg.Length)" -ForegroundColor DarkGray
}

# ── Paths ────────────────────────────────────────────────────────────────────
$Root        = $PSScriptRoot
$ServerDir   = Join-Path $Root "server"
$WebDir      = Join-Path $Root "web"
$ComposeFile = Join-Path $Root "docker-compose.yml"

$DockerPort   = 3001
$LocalApiPort = 3001
$LocalWebPort = 5173

$HealthUrl    = "http://localhost:$DockerPort/api/health"

# ── Helpers ──────────────────────────────────────────────────────────────────
function Test-CommandExists([string]$cmd) {
    return $null -ne (Get-Command $cmd -ErrorAction SilentlyContinue)
}

function Wait-ForHealth {
    param([string]$Url, [int]$TimeoutSec = 120, [int]$PollMs = 2000)

    Write-Step "Waiting for health check at $Url (timeout: ${TimeoutSec}s)"
    $deadline = [DateTime]::UtcNow.AddSeconds($TimeoutSec)
    $attempt  = 0

    while ([DateTime]::UtcNow -lt $deadline) {
        $attempt++
        try {
            $resp = Invoke-WebRequest -Uri $Url -TimeoutSec 3 -UseBasicParsing -ErrorAction Stop
            if ($resp.StatusCode -eq 200) {
                Write-Ok "Health check passed (attempt $attempt)"
                return $true
            }
        } catch {
            # Not ready yet
        }
        Write-Host "  . attempt $attempt — not ready, retrying in $($PollMs/1000)s" -ForegroundColor DarkGray
        Start-Sleep -Milliseconds $PollMs
    }

    Write-Fail "Health check timed out after ${TimeoutSec}s"
    return $false
}

function Open-Browser([string]$Url) {
    Write-Step "Opening browser at $Url"
    try {
        Start-Process $Url
    } catch {
        Write-Info "Could not open browser automatically. Navigate to: $Url"
    }
}

function Confirm-Smoke([string]$BaseUrl) {
    Write-Banner "Smoke verification"

    $checks = @(
        @{ label = "Health endpoint";  url = "$BaseUrl/api/health" },
        @{ label = "Files API (list)"; url = "$BaseUrl/api/files" },
        @{ label = "Frontend HTML";    url = $BaseUrl }
    )

    $allOk = $true
    foreach ($check in $checks) {
        try {
            $r = Invoke-WebRequest -Uri $check.url -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
            if ($r.StatusCode -eq 200) {
                Write-Ok "$($check.label)  [$($r.StatusCode)]"
            } else {
                Write-Fail "$($check.label)  [$($r.StatusCode)]"
                $allOk = $false
            }
        } catch {
            Write-Fail "$($check.label)  — $($_.Exception.Message)"
            $allOk = $false
        }
    }
    return $allOk
}

# ════════════════════════════════════════════════════════════════════════════
#  MODE: stop
# ════════════════════════════════════════════════════════════════════════════
if ($Mode -eq "stop") {
    Write-Banner "Stopping containers"
    if (-not (Test-CommandExists "docker")) { Write-Fail "docker not found"; exit 1 }
    Push-Location $Root
    docker compose down
    Pop-Location
    Write-Ok "Containers stopped."
    exit 0
}

# ════════════════════════════════════════════════════════════════════════════
#  MODE: logs
# ════════════════════════════════════════════════════════════════════════════
if ($Mode -eq "logs") {
    Write-Banner "Container logs"
    if (-not (Test-CommandExists "docker")) { Write-Fail "docker not found"; exit 1 }
    Push-Location $Root
    docker compose logs -f
    Pop-Location
    exit 0
}

# ════════════════════════════════════════════════════════════════════════════
#  MODE: local
# ════════════════════════════════════════════════════════════════════════════
if ($Mode -eq "local") {
    Write-Banner "Local dev mode (npm)"

    if (-not (Test-CommandExists "node")) { Write-Fail "Node.js not found — install Node 20+"; exit 1 }
    $nodeVer = (node -v) -replace "v",""
    $nodeMajor = [int]($nodeVer.Split(".")[0])
    if ($nodeMajor -lt 20) { Write-Fail "Node $nodeVer found — Node 20+ required"; exit 1 }
    Write-Ok "Node v$nodeVer"

    # Install deps if needed
    foreach ($dir in @($ServerDir, $WebDir)) {
        $nm = Join-Path $dir "node_modules"
        if (-not (Test-Path $nm)) {
            Write-Step "Installing deps in $dir"
            Push-Location $dir
            npm install --userconfig (Join-Path $Root ".npmrc") --silent
            Pop-Location
        }
    }

    # Start server in background
    Write-Step "Starting API server on port $LocalApiPort"
    $serverJob = Start-Job -ScriptBlock {
        param($dir)
        Set-Location $dir
        npx tsx src/index.ts
    } -ArgumentList $ServerDir

    # Wait for server health
    $healthUrl = "http://localhost:$LocalApiPort/api/health"
    $ready = Wait-ForHealth -Url $healthUrl -TimeoutSec 30 -PollMs 1000
    if (-not $ready) {
        Write-Fail "Server did not start. Job output:"
        Receive-Job $serverJob | Write-Host
        Stop-Job $serverJob
        exit 1
    }

    # Start Vite in background
    Write-Step "Starting Vite dev server on port $LocalWebPort"
    $webJob = Start-Job -ScriptBlock {
        param($dir)
        Set-Location $dir
        npx vite
    } -ArgumentList $WebDir

    # Wait for Vite
    $viteUrl = "http://localhost:$LocalWebPort"
    $ready = Wait-ForHealth -Url $viteUrl -TimeoutSec 30 -PollMs 1000
    if (-not $ready) {
        Write-Fail "Vite did not start. Job output:"
        Receive-Job $webJob | Write-Host
        Stop-Job $serverJob; Stop-Job $webJob
        exit 1
    }

    $ok = Confirm-Smoke -BaseUrl $viteUrl
    if (-not $NoBrowser) { Open-Browser $viteUrl }

    Write-Banner "Dev servers running"
    Write-Info "  API:      http://localhost:$LocalApiPort"
    Write-Info "  Frontend: $viteUrl"
    Write-Info ""
    Write-Info "Press Ctrl+C to stop."

    try {
        while ($true) {
            Start-Sleep -Seconds 5
            $srvState = (Get-Job $serverJob.Id).State
            $webState = (Get-Job $webJob.Id).State
            if ($srvState -ne "Running" -or $webState -ne "Running") {
                Write-Fail "A dev server stopped unexpectedly."
                Receive-Job $serverJob | ForEach-Object { Write-Info "[server] $_" }
                Receive-Job $webJob    | ForEach-Object { Write-Info "[web]    $_" }
                break
            }
        }
    } finally {
        Stop-Job $serverJob -ErrorAction SilentlyContinue
        Stop-Job $webJob    -ErrorAction SilentlyContinue
        Remove-Job $serverJob, $webJob -ErrorAction SilentlyContinue
    }
    exit 0
}

# ════════════════════════════════════════════════════════════════════════════
#  MODE: docker  (default)
# ════════════════════════════════════════════════════════════════════════════
Write-Banner "Markdown Editor POC — Docker"

# Pre-flight checks
Write-Step "Checking prerequisites"

if (-not (Test-CommandExists "docker")) {
    Write-Fail "docker not found. Install Docker Desktop from https://www.docker.com/products/docker-desktop"
    exit 1
}

# Check Docker daemon is actually running
try {
    docker info *>$null
    Write-Ok "Docker daemon running"
} catch {
    Write-Fail "Docker daemon is not running. Start Docker Desktop and retry."
    exit 1
}

$composeOk = (Test-CommandExists "docker-compose") -or
             (& { docker compose version *>$null 2>&1; $LASTEXITCODE -eq 0 })
if (-not $composeOk) {
    Write-Fail "docker compose plugin not found"
    exit 1
}
Write-Ok "docker compose available"

if (-not (Test-Path $ComposeFile)) {
    Write-Fail "docker-compose.yml not found at $Root"
    exit 1
}

# Check if .npmrc exists (needed for web build inside Docker)
$npmrc = Join-Path $Root ".npmrc"
if (-not (Test-Path $npmrc)) {
    Write-Info "Creating .npmrc pointing to public npm registry..."
    "registry=https://registry.npmjs.org/" | Set-Content $npmrc
}

# ── Build + start ─────────────────────────────────────────────────────────
Write-Banner "Building Docker image"
Write-Info "(This takes 2-5 minutes on first run while npm packages are downloaded.)"
Write-Info ""

Push-Location $Root
try {
    docker compose --progress plain build
    if ($LASTEXITCODE -ne 0) { throw "docker compose build failed (exit $LASTEXITCODE)" }
    Write-Ok "Build complete"

    Write-Banner "Starting container"
    docker compose up -d
    if ($LASTEXITCODE -ne 0) { throw "docker compose up failed (exit $LASTEXITCODE)" }
    Write-Ok "Container started"
} catch {
    Write-Fail $_.Exception.Message
    Write-Info ""
    Write-Info "--- Container logs ---"
    docker compose logs
    Pop-Location
    exit 1
} finally {
    Pop-Location
}

# ── Wait for health ───────────────────────────────────────────────────────
$ready = Wait-ForHealth -Url $HealthUrl -TimeoutSec 120 -PollMs 2000
if (-not $ready) {
    Write-Fail "App did not become healthy within 120s."
    Write-Info ""
    Write-Info "--- Container logs ---"
    Push-Location $Root
    docker compose logs --tail 50
    Pop-Location
    exit 1
}

# ── Smoke tests ───────────────────────────────────────────────────────────
$appUrl = "http://localhost:$DockerPort"
$smokeOk = Confirm-Smoke -BaseUrl $appUrl

# ── Open browser ─────────────────────────────────────────────────────────
if (-not $NoBrowser) {
    Open-Browser $appUrl
}

# ── Summary ──────────────────────────────────────────────────────────────
Write-Banner "Ready"
Write-Info "  URL:        $appUrl"
Write-Info "  Health:     $HealthUrl"
Write-Info "  Workspace:  $(Join-Path $Root 'workspace')  (mounted into container)"
Write-Info ""

if (-not $smokeOk) {
    Write-Info "  Some smoke checks failed — check the logs above."
}

Write-Info "  Useful commands:"
Write-Info "    .\dev.ps1 -Mode logs    # stream container logs"
Write-Info "    .\dev.ps1 -Mode stop    # stop the container"
Write-Info ""

if ($Follow) {
    Write-Step "Following container logs (Ctrl+C to detach)"
    Push-Location $Root
    docker compose logs -f
    Pop-Location
}
