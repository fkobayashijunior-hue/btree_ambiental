# build-staging-package.ps1
#
# Gera o pacote .zip de deploy para o ambiente de STAGING na Hostinger
# (staging.btreeambiental.com), sem tocar em nada de produção.
#
# Uso (na raiz do projeto, PowerShell):
#   .\scripts\build-staging-package.ps1
#
# O que este script faz:
#   1. Compila o frontend (vite build) e o backend (esbuild) com o código atual
#   2. Normaliza o build.sh para LF (evita o erro de CRLF do bash na Hostinger)
#   3. Monta uma pasta temporária só com o que precisa ir pro servidor
#      (sem node_modules, .git, .env, .github, client/dist legado)
#   4. Compacta em .zip com caminhos em "/" (Compress-Archive do Windows usa
#      "\" e quebra a extração no Linux — por isso usamos System.IO.Compression)
#   5. Salva o zip em Downloads, com timestamp no nome

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

Write-Output "=== 1/5: Compilando frontend (vite build) ==="
npx vite build
if ($LASTEXITCODE -ne 0) { throw "vite build falhou" }

Write-Output "=== 2/5: Compilando backend (esbuild) ==="
npx esbuild server/_core/index.ts --platform=node --packages=external --bundle --format=esm --outfile=dist/index.js
if ($LASTEXITCODE -ne 0) { throw "esbuild falhou" }

Write-Output "=== 3/5: Normalizando build.sh para LF (o Git no Windows costuma converter para CRLF) ==="
$buildShPath = Join-Path $repoRoot "build.sh"
$content = [System.IO.File]::ReadAllText($buildShPath)
$lf = [char]10
$crlf = [string]([char]13) + [char]10
$content = $content.Replace($crlf, [string]$lf)
[System.IO.File]::WriteAllText($buildShPath, $content)

Write-Output "=== 4/5: Montando pasta de staging ==="
$stage = Join-Path $repoRoot "_staging_deploy_stage"
if (Test-Path $stage) { Remove-Item -Recurse -Force $stage }
New-Item -ItemType Directory -Path $stage | Out-Null

$itemsToCopy = @("build.sh", "package.json", "package.hostinger.json", "client", "server", "drizzle", "dist")
foreach ($item in $itemsToCopy) {
    $srcPath = Join-Path $repoRoot $item
    if (Test-Path $srcPath) {
        Copy-Item -Path $srcPath -Destination (Join-Path $stage $item) -Recurse -Force
    } else {
        Write-Warning "Nao encontrado, pulando: $item"
    }
}
# client/dist e um artefato legado (nao usado pelo build atual, que gera em dist/public)
$clientDistStaged = Join-Path $stage "client\dist"
if (Test-Path $clientDistStaged) { Remove-Item -Recurse -Force $clientDistStaged }

Write-Output "=== 5/5: Compactando ==="
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$timestamp = Get-Date -Format "yyyyMMdd_HHmm"
$downloadsDir = Join-Path $env:USERPROFILE "Downloads"
$zipPath = Join-Path $downloadsDir "btree_staging_deploy_$timestamp.zip"
if ([System.IO.File]::Exists($zipPath)) { [System.IO.File]::Delete($zipPath) }

$zip = [System.IO.Compression.ZipFile]::Open($zipPath, [System.IO.Compression.ZipArchiveMode]::Create)
$baseFull = (Resolve-Path $stage).Path
$bsChar = [char]92
$count = 0
Get-ChildItem -Path $stage -Recurse -File -Force | ForEach-Object {
    $fullPath = $_.FullName
    $relative = $fullPath.Substring($baseFull.Length + 1)
    $relative = $relative.Replace($bsChar, '/')
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $fullPath, $relative, [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
    $count++
}
$zip.Dispose()

Remove-Item -Recurse -Force $stage

Write-Output ""
Write-Output "=== Pronto ==="
Write-Output "Arquivos no pacote: $count"
Write-Output "Zip gerado: $zipPath"
Write-Output ""
Write-Output "Proximo passo: envie esse arquivo na tela 'Implantacoes' do app"
Write-Output "staging.btreeambiental.com no hPanel da Hostinger."
