Set-StrictMode -Version Latest

# Freigegeben am 18.07.2026 für den read-only Baseline-Ablauf.
# Die Werte enthalten keine Zugangsdaten und verändern weder System noch Datenbank.
$ApprovedPsqlPath = 'D:\Program Files\PostgreSQL\18\bin\psql.exe'
$ApprovedPgDumpPath = 'D:\Program Files\PostgreSQL\18\bin\pg_dump.exe'

$ApprovedPsqlSha256 = '1116C77F820606F52CD3D0F676012470D494092CBA321A6CBD898F4701EB944E'
$ApprovedPgDumpSha256 = '46C8AD2E487FA01BB5401AE3B383C09E20789EFDD3A37C6940975647EB1FF574'
$ApprovedPostgresToolVersion = '18.4'

function Assert-ApprovedPostgresTool {
    param(
        [Parameter(Mandatory)]
        [string] $LiteralPath,

        [Parameter(Mandatory)]
        [string] $ExpectedSha256,

        [Parameter(Mandatory)]
        [string] $ExpectedVersion
    )

    if (-not (Test-Path -LiteralPath $LiteralPath -PathType Leaf)) {
        throw "Freigegebenes PostgreSQL-Werkzeug fehlt: $LiteralPath"
    }

    $actualHash = (Get-FileHash -LiteralPath $LiteralPath -Algorithm SHA256).Hash
    if ($actualHash -ne $ExpectedSha256) {
        throw "SHA-256-Prüfung fehlgeschlagen: $LiteralPath"
    }

    $actualVersion = (Get-Item -LiteralPath $LiteralPath).VersionInfo.ProductVersion
    if ($actualVersion -ne $ExpectedVersion) {
        throw "Versionsprüfung fehlgeschlagen: $LiteralPath"
    }
}

Assert-ApprovedPostgresTool `
    -LiteralPath $ApprovedPsqlPath `
    -ExpectedSha256 $ApprovedPsqlSha256 `
    -ExpectedVersion $ApprovedPostgresToolVersion

Assert-ApprovedPostgresTool `
    -LiteralPath $ApprovedPgDumpPath `
    -ExpectedSha256 $ApprovedPgDumpSha256 `
    -ExpectedVersion $ApprovedPostgresToolVersion
