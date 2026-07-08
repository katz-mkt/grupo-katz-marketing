# atualizar.ps1 — Atualização semanal do Dashboard de Marketing
# Executado automaticamente toda terca-feira as 09:00 pelo Windows Task Scheduler

$ErrorActionPreference = 'Stop'

$PROJETO = "C:\Users\Usuario\Documents\_CLAUDE\relatorio-marketing"
$LOG     = "$PROJETO\update.log"
$NODE    = (Get-Command node -ErrorAction SilentlyContinue)?.Source

if (-not $NODE) {
    Add-Content $LOG "[$(Get-Date -Format 'yyyy-MM-dd HH:mm')] ERRO: Node.js nao encontrado."
    exit 1
}

Add-Content $LOG "`n[$(Get-Date -Format 'yyyy-MM-dd HH:mm')] Iniciando atualizacao..."

try {
    # 1) Atualiza dashboard semanal (update.js ja faz git commit+push do data.js)
    $resultado = & node "$PROJETO\update.js" 2>&1
    Add-Content $LOG $resultado

    # 2) Sincroniza a base historica (Google Sheets) e regenera report-data.js
    Add-Content $LOG "[$(Get-Date -Format 'yyyy-MM-dd HH:mm')] Sincronizando base historica..."
    $relatorio = & node "$PROJETO\sync-base.js" 2>&1
    Add-Content $LOG $relatorio

    # 3) Commit + push do relatorio (data.js ja foi pelo update.js)
    Push-Location $PROJETO
    try {
        & git add report-data.js relatorio.html 2>&1 | Out-Null
        $semana = Get-Date -Format 'yyyy-MM-dd'
        & git commit -m "relatorio: atualizacao detalhada $semana" 2>&1 | Out-Null
        & git push origin main 2>&1 | Out-Null
        Add-Content $LOG "[$(Get-Date -Format 'yyyy-MM-dd HH:mm')] Relatorio publicado no GitHub."
    } finally {
        Pop-Location
    }

    Add-Content $LOG "[$(Get-Date -Format 'yyyy-MM-dd HH:mm')] Concluido com sucesso."
} catch {
    Add-Content $LOG "[$(Get-Date -Format 'yyyy-MM-dd HH:mm')] ERRO: $_"
    exit 1
}
