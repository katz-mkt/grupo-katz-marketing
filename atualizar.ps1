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
    $resultado = & node "$PROJETO\update.js" 2>&1
    Add-Content $LOG $resultado
    Add-Content $LOG "[$(Get-Date -Format 'yyyy-MM-dd HH:mm')] Concluido com sucesso."
} catch {
    Add-Content $LOG "[$(Get-Date -Format 'yyyy-MM-dd HH:mm')] ERRO: $_"
    exit 1
}
