param(
    [switch]$NoFrontend,
    [switch]$NoBackend,
    [switch]$NoML,
    [switch]$NoDashboard
)

$ErrorActionPreference = "Stop"

# Script lives in sc3099-fe. Repos are siblings under the same parent folder.
$frontendRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = Split-Path -Parent $frontendRoot

$paths = @{
    frontend = Join-Path $root "sc3099-fe"
    backend = Join-Path $root "sc3099-be"
    ml = Join-Path $root "sc3099-ml"
    dashboard = Join-Path $root "sc3099-dashboard"
}

function Wait-ForHttpHealthy {
    param(
        [Parameter(Mandatory = $true)][string]$Url,
        [int]$TimeoutSeconds = 45
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        try {
            $resp = Invoke-WebRequest -Uri $Url -Method Get -TimeoutSec 3 -UseBasicParsing
            if ($resp.StatusCode -eq 200) {
                $json = $null
                try { $json = $resp.Content | ConvertFrom-Json } catch {}

                if (
                    -not $json -or
                    $json.status -eq "healthy" -or
                    $json.health -eq "healthy" -or
                    $json.ok -eq $true
                ) {
                    Write-Host "Health check OK: $Url"
                    return $true
                }
            }
        } catch {
            # keep retrying until timeout
        }

        Start-Sleep -Milliseconds 800
    }

    Write-Warning "Timed out waiting for health: $Url"
    return $false
}

function Start-DevWindow {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][string]$Workdir,
        [Parameter(Mandatory = $true)][string]$Command
    )

    if (-not (Test-Path -LiteralPath $Workdir)) {
        Write-Warning "[$Name] Skipped. Folder not found: $Workdir"
        return
    }

    Write-Host "Starting $Name in $Workdir"
    Start-Process -FilePath "powershell.exe" -WorkingDirectory $Workdir -ArgumentList @(
        "-NoExit",
        "-Command",
        $Command
    ) | Out-Null
}

function Start-BackendWhenReady {
    param(
        [Parameter(Mandatory = $true)][string]$Workdir,
        [bool]$ShouldWaitForML = $true
    )

    if ($ShouldWaitForML) {
        $ready = Wait-ForHttpHealthy -Url "http://localhost:8001/health" -TimeoutSeconds 60
        if (-not $ready) {
            Write-Warning "ML did not report healthy in time. Starting backend anyway."
        } else {
            Write-Host "ML is healthy. Starting backend..."
        }
    }

    Start-DevWindow -Name "Backend (Fastify)" -Workdir $Workdir -Command "npm run dev"
}

# Start ML first so backend health probe has a chance to pass on boot.
if (-not $NoML) {
    $mlCommand = @"
if (Test-Path -LiteralPath ".\.venv\Scripts\Activate.ps1") {
    . .\.venv\Scripts\Activate.ps1
}
python -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
"@
    Start-DevWindow -Name "ML (FastAPI)" -Workdir $paths.ml -Command $mlCommand
}

if (-not $NoBackend) {
    Start-BackendWhenReady -Workdir $paths.backend -ShouldWaitForML (-not $NoML)
}

if (-not $NoFrontend) {
    Start-DevWindow -Name "Frontend (Next.js)" -Workdir $paths.frontend -Command "npm run dev"
}

if (-not $NoDashboard) {
    Start-DevWindow -Name "Dashboard (Streamlit)" -Workdir $paths.dashboard -Command "python -m streamlit run app.py --server.port 8501"
}

Write-Host ""
Write-Host "All selected services started."
Write-Host "Close each spawned PowerShell window to stop each service."
Write-Host ""
Write-Host "Examples:"
Write-Host "  .\start-sc3099.ps1"
Write-Host "  .\start-sc3099.ps1 -NoDashboard"
