Set-StrictMode -Version Latest

# Freigegeben am 19.07.2026 für den lokalen Baseline-Gate-Ablauf (Abschnitt 10).
# Herkunft: supabase_2.109.1_windows_amd64.zip von
# https://github.com/supabase/cli/releases/tag/v2.109.1 heruntergeladen; die ZIP-Datei
# wurde vor dem Entpacken gegen den offiziellen Eintrag in der dortigen checksums.txt
# geprüft (SHA-256 d0d270692cf78b8aa56545461f02cdf929ce9bb94e95e5e66404fd0e7d2c0c16).
# Der folgende Hash ist der SHA-256 der daraus entpackten supabase.exe selbst (nicht der
# ZIP), entpackt nach .\tools\supabase-cli\ ohne PATH-Änderung und ohne globale Installation.
$ApprovedSupabasePath = Join-Path $PSScriptRoot '..\tools\supabase-cli\supabase.exe'
$ApprovedSupabaseSha256 = '22C0F28F013411C7A7B880116CD33636EDB955A64278914692EEA010BCC98DC7'
$ApprovedSupabaseCliVersion = '2.109.1'

function Assert-ApprovedSupabaseCli {
    param(
        [Parameter(Mandatory)]
        [string] $LiteralPath,

        [Parameter(Mandatory)]
        [string] $ExpectedSha256,

        [Parameter(Mandatory)]
        [string] $ExpectedVersion
    )

    if (-not (Test-Path -LiteralPath $LiteralPath -PathType Leaf)) {
        throw "Freigegebene Supabase-CLI fehlt: $LiteralPath"
    }

    $actualHash = (Get-FileHash -LiteralPath $LiteralPath -Algorithm SHA256).Hash
    if ($actualHash -ne $ExpectedSha256) {
        throw "SHA-256-Prüfung fehlgeschlagen: $LiteralPath"
    }

    $actualVersion = & $LiteralPath --version
    if ($actualVersion.Trim() -ne $ExpectedVersion) {
        throw "Versionsprüfung fehlgeschlagen: $LiteralPath (gefunden: $actualVersion)"
    }
}

Assert-ApprovedSupabaseCli `
    -LiteralPath $ApprovedSupabasePath `
    -ExpectedSha256 $ApprovedSupabaseSha256 `
    -ExpectedVersion $ApprovedSupabaseCliVersion
