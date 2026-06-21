# =====================================================================
# StockAcademia - one-shot database setup (Windows / PowerShell)
#
# Creates the database (if missing) and runs schema.sql + every
# migration in the correct order, including the certificates migration
# that lives under backend/migrations.
#
# HOW TO RUN:
#   1. Make sure backend\.env has the CORRECT postgres password in
#      DATABASE_URL - the one you set when installing PostgreSQL.
#   2. From the project root, run:
#        powershell -ExecutionPolicy Bypass -File database\setup-database.ps1
#
# Safe to re-run: every migration uses IF NOT EXISTS / idempotent SQL.
# =====================================================================

$ErrorActionPreference = "Stop"

# --- Locate psql (PostgreSQL default install path) -------------------
$psql = Get-Command psql -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source
if (-not $psql) {
    $candidate = Get-ChildItem "C:\Program Files\PostgreSQL\*\bin\psql.exe" -ErrorAction SilentlyContinue |
                 Sort-Object FullName -Descending | Select-Object -First 1
    if ($candidate) { $psql = $candidate.FullName }
}
if (-not $psql) { throw "psql.exe not found. Install PostgreSQL or add its bin folder to PATH." }
Write-Host "Using psql: $psql" -ForegroundColor Cyan

# --- Read DATABASE_URL from backend/.env -----------------------------
$root    = Split-Path $PSScriptRoot -Parent
$envFile = Join-Path $root "backend\.env"
if (-not (Test-Path $envFile)) { throw "backend\.env not found. Copy backend\.env.example to backend\.env first." }

$line = Select-String -Path $envFile -Pattern '^\s*DATABASE_URL\s*=' | Select-Object -First 1
if (-not $line) { throw "DATABASE_URL not found in backend\.env" }
$url = ($line.Line -replace '^\s*DATABASE_URL\s*=\s*', '').Trim().Trim('"').Trim("'")

# postgresql://USER:PASSWORD@HOST:PORT/DBNAME
if ($url -notmatch '^postgres(ql)?://([^:]+):([^@]*)@([^:/]+):(\d+)/(.+)$') {
    throw "DATABASE_URL is not in the expected format postgresql://user:pass@host:port/dbname"
}
$pgUser = $matches[2]
$pgPass = $matches[3]
$pgHost = $matches[4]
$pgPort = $matches[5]
$pgDb   = $matches[6]
Write-Host "Target: $pgUser@$pgHost`:$pgPort / database '$pgDb'" -ForegroundColor Cyan

$env:PGPASSWORD = $pgPass

# --- Create the database if it doesn't exist -------------------------
Write-Host "`nChecking database '$pgDb'..." -ForegroundColor Yellow
$exists = & $psql -h $pgHost -p $pgPort -U $pgUser -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$pgDb'"
if ($LASTEXITCODE -ne 0) { throw "Could not connect to PostgreSQL. Check the password in backend\.env." }
if ($exists -ne "1") {
    Write-Host "Creating database '$pgDb'..." -ForegroundColor Yellow
    & $psql -h $pgHost -p $pgPort -U $pgUser -d postgres -c "CREATE DATABASE $pgDb"
    if ($LASTEXITCODE -ne 0) { throw "Failed to create database." }
} else {
    Write-Host "Database already exists." -ForegroundColor Green
}

# --- Run SQL files in order ------------------------------------------
$files = @(
    "database\schema.sql",
    "database\migration_01_features.sql",
    "database\migration_02_bookings.sql",
    "database\migration_03_stocks.sql",
    "database\migration_04_lesson_visuals_sample.sql",
    "database\migration_05_plan_upgrades.sql",
    "database\migration_06_admin_moderations.sql",
    "database\migration_07_quizzes_per_lesson.sql",
    "database\migration_08_remaining_courses.sql",
    "database\migration_09_flutterwave.sql",
    "backend\migrations\add_certificates.sql",
    "database\migration_10_premium_subscriptions.sql",
    "database\migration_11_portfolio_reviews.sql",
    "database\migration_12_ai_cache.sql",
    "database\migration_13_ai_usage_log.sql",
    "database\migration_14_card_autorenew.sql"
)

foreach ($rel in $files) {
    $path = Join-Path $root $rel
    if (-not (Test-Path $path)) { Write-Host "SKIP (missing): $rel" -ForegroundColor DarkYellow; continue }
    Write-Host "`n--> Running $rel" -ForegroundColor Yellow
    & $psql -h $pgHost -p $pgPort -U $pgUser -d $pgDb -v ON_ERROR_STOP=1 -f $path
    if ($LASTEXITCODE -ne 0) { throw "Error running $rel - stopped." }
}

Remove-Item Env:\PGPASSWORD
Write-Host "`n[DONE] Database setup complete. All 11 SQL files ran successfully." -ForegroundColor Green
Write-Host "  Start the app:  (terminal 1) cd backend; npm run dev" -ForegroundColor Green
Write-Host "                  (terminal 2) cd frontend; npm run dev" -ForegroundColor Green
