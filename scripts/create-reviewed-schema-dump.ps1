[CmdletBinding()]
param(
    [string] $EvidenceDate = (Get-Date -Format 'yyyy-MM-dd')
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

. "$PSScriptRoot\approved-db-connection.ps1"

$workspaceRoot = Split-Path -Parent $PSScriptRoot
$privateRoot = Join-Path $workspaceRoot 'docs\migration-evidence\private'
$evidenceDirectory = Join-Path $privateRoot $EvidenceDate
$dumpPath = Join-Path $evidenceDirectory "step0PublicSchema.$EvidenceDate.sql"
$reviewPath = Join-Path $evidenceDirectory "step0PublicSchema.$EvidenceDate.review.txt"

if (-not (Test-Path -LiteralPath $privateRoot -PathType Container)) {
    throw "Geschütztes Evidenzverzeichnis fehlt: $privateRoot"
}

if (Test-Path -LiteralPath $dumpPath) {
    throw "Dump existiert bereits und wird nicht überschrieben: $dumpPath"
}

if (Test-Path -LiteralPath $reviewPath) {
    throw "Review existiert bereits und wird nicht überschrieben: $reviewPath"
}

$securePassword = Read-Host 'Temporäres Kennwort für zap_baseline_reader' -AsSecureString
$passwordPointer = [IntPtr]::Zero
$plainPassword = $null

$managedEnvironmentNames = @(
    'PGPASSWORD',
    'PGSERVICEFILE',
    'PGSSLROOTCERT',
    'PGOPTIONS',
    'PGAPPNAME'
)
$previousEnvironment = @{}
foreach ($name in $managedEnvironmentNames) {
    $previousEnvironment[$name] = [Environment]::GetEnvironmentVariable($name, 'Process')
}

try {
    $passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
    $plainPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)

    $env:PGPASSWORD = $plainPassword
    $env:PGSERVICEFILE = $ApprovedPgServiceFile
    $env:PGSSLROOTCERT = $ApprovedSupabaseCaPath
    $env:PGOPTIONS = '-c default_transaction_read_only=on -c statement_timeout=60000 -c lock_timeout=5000'
    $env:PGAPPNAME = 'zap_baseline_schema_dump'

    $identity = & $ApprovedPsqlPath `
        -X `
        --no-password `
        --set=ON_ERROR_STOP=1 `
        --tuples-only `
        --no-align `
        "service=$ApprovedPgServiceName" `
        --command "SELECT current_database() || '|' || current_user || '|' || current_setting('transaction_read_only');"

    if ($LASTEXITCODE -ne 0) {
        throw "Read-only-Identitätsprüfung fehlgeschlagen (Exit-Code $LASTEXITCODE)."
    }

    $identityValue = ($identity | Out-String).Trim()
    if ($identityValue -ne 'postgres|zap_baseline_reader|on') {
        throw "Unerwartete DB-Identität oder fehlender Read-only-Modus: $identityValue"
    }

    New-Item -ItemType Directory -Path $evidenceDirectory -Force | Out-Null

    & $ApprovedPgDumpPath `
        "service=$ApprovedPgServiceName" `
        --schema-only `
        --schema=public `
        --no-owner `
        --no-tablespaces `
        --encoding=UTF8 `
        --lock-wait-timeout=5000 `
        --file=$dumpPath

    if ($LASTEXITCODE -ne 0) {
        throw "pg_dump fehlgeschlagen (Exit-Code $LASTEXITCODE)."
    }

    $dump = Get-Content -LiteralPath $dumpPath -Raw
    if ([string]::IsNullOrWhiteSpace($dump)) {
        throw 'Der erzeugte Dump ist leer.'
    }

    $forbiddenTopLevelData = [regex]::Matches(
        $dump,
        '(?mi)^(COPY\s+|INSERT\s+INTO\s+|UPDATE\s+|DELETE\s+FROM\s+|TRUNCATE\s+)'
    )
    if ($forbiddenTopLevelData.Count -gt 0) {
        throw "Dump enthält $($forbiddenTopLevelData.Count) unerwartete Top-Level-Datenanweisungen."
    }

    $secretPatterns = @(
        'eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}',
        'postgres(?:ql)?://[^\s:@]+:[^\s@]+@',
        '(?i)(password|secret|service[_-]?role[_-]?key)\s*[=:]\s*[''\"][^''\"]{8,}[''\"]'
    )
    $secretHitCount = 0
    foreach ($pattern in $secretPatterns) {
        $secretHitCount += [regex]::Matches($dump, $pattern).Count
    }
    if ($secretHitCount -gt 0) {
        throw "Dump enthält $secretHitCount mögliche Geheimnismuster."
    }

    $dumpHash = (Get-FileHash -LiteralPath $dumpPath -Algorithm SHA256).Hash
    $reviewLines = @(
        "captured_at_utc=$([DateTime]::UtcNow.ToString('o'))",
        'database=postgres',
        'role=zap_baseline_reader',
        'transaction_read_only=on',
        'tls=verify-full',
        'schemas=public',
        'format=plain schema-only',
        'owner_statements_suppressed=true',
        'tablespaces_suppressed=true',
        "top_level_data_statements=$($forbiddenTopLevelData.Count)",
        "secret_pattern_hits=$secretHitCount",
        "create_table_statements=$([regex]::Matches($dump, '(?mi)^CREATE TABLE ').Count)",
        "create_view_statements=$([regex]::Matches($dump, '(?mi)^CREATE VIEW ').Count)",
        "create_function_statements=$([regex]::Matches($dump, '(?mi)^CREATE (OR REPLACE )?FUNCTION ').Count)",
        "create_policy_statements=$([regex]::Matches($dump, '(?mi)^CREATE POLICY ').Count)",
        "sha256=$dumpHash",
        "dump_file=$([IO.Path]::GetFileName($dumpPath))"
    )
    Set-Content -LiteralPath $reviewPath -Value $reviewLines -Encoding utf8NoBOM

    Write-Output 'SCHEMA_DUMP_CREATED=true'
    Write-Output "DUMP_PATH=$dumpPath"
    Write-Output "REVIEW_PATH=$reviewPath"
    Write-Output "SHA256=$dumpHash"
    Write-Output "TOP_LEVEL_DATA_STATEMENTS=$($forbiddenTopLevelData.Count)"
    Write-Output "SECRET_PATTERN_HITS=$secretHitCount"
} finally {
    $plainPassword = $null
    if ($passwordPointer -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
    }

    foreach ($name in $managedEnvironmentNames) {
        $previousValue = $previousEnvironment[$name]
        if ($null -eq $previousValue) {
            [Environment]::SetEnvironmentVariable($name, $null, 'Process')
        } else {
            [Environment]::SetEnvironmentVariable($name, $previousValue, 'Process')
        }
    }
}
