Set-StrictMode -Version Latest

. "$PSScriptRoot\approved-postgres-tools.ps1"

# Diese Konfiguration enthält ausdrücklich kein Kennwort.
$WorkspaceRoot = Split-Path -Parent $PSScriptRoot
$ApprovedPgServiceName = 'zap_baseline_readonly'
$ApprovedPgServiceFile = Join-Path $WorkspaceRoot 'supabase\pg_service.conf'
$ApprovedSupabaseCaPath = Join-Path $WorkspaceRoot 'supabase\prod-ca-2021.crt'
$ApprovedSupabaseCaSha256 = '700723581420DD1AC98FD7E9AC529F0EF210EADCAF87FC868A3AD7D114C2F3B7'

if (-not (Test-Path -LiteralPath $ApprovedPgServiceFile -PathType Leaf)) {
    throw "Freigegebene PostgreSQL-Servicekonfiguration fehlt: $ApprovedPgServiceFile"
}

if (-not (Test-Path -LiteralPath $ApprovedSupabaseCaPath -PathType Leaf)) {
    throw "Freigegebenes Supabase-CA-Zertifikat fehlt: $ApprovedSupabaseCaPath"
}

$actualCaHash = (Get-FileHash -LiteralPath $ApprovedSupabaseCaPath -Algorithm SHA256).Hash
if ($actualCaHash -ne $ApprovedSupabaseCaSha256) {
    throw "SHA-256-Prüfung des Supabase-CA-Zertifikats fehlgeschlagen."
}

$serviceContent = Get-Content -LiteralPath $ApprovedPgServiceFile -Raw
$requiredServiceEntries = @(
    '[zap_baseline_readonly]',
    'host=aws-0-eu-central-2.pooler.supabase.com',
    'port=5432',
    'dbname=postgres',
    'user=zap_baseline_reader.ybzdibifgqjsbohtztmy',
    'sslmode=verify-full'
)

foreach ($requiredEntry in $requiredServiceEntries) {
    if (-not $serviceContent.Contains($requiredEntry)) {
        throw "Pflichtangabe fehlt in der PostgreSQL-Servicekonfiguration: $requiredEntry"
    }
}

if ($serviceContent -match '(?m)^sslrootcert\s*=') {
    throw 'sslrootcert darf nicht als arbeitsplatzabhängiger Pfad in pg_service.conf stehen. Setze PGSSLROOTCERT aus $ApprovedSupabaseCaPath.'
}
