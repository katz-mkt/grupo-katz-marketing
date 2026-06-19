@echo off
:: instalar-tarefa.bat
:: Execute este arquivo como Administrador (clique direito > Executar como administrador)
:: Registra a atualizacao semanal do dashboard no Windows Task Scheduler

echo Registrando tarefa agendada...

schtasks /create /tn "GrupoKatz-DashboardMarketing" ^
  /tr "powershell.exe -NonInteractive -WindowStyle Hidden -File \"C:\Users\Usuario\Documents\_CLAUDE\relatorio-marketing\atualizar.ps1\"" ^
  /sc WEEKLY /d TUE /st 09:00 ^
  /ru "%USERNAME%" ^
  /rl HIGHEST ^
  /f

if %ERRORLEVEL% EQU 0 (
    echo.
    echo [OK] Tarefa registrada com sucesso!
    echo      Executa toda terca-feira as 09:00
    echo      Nome: GrupoKatz-DashboardMarketing
) else (
    echo.
    echo [ERRO] Falha ao registrar. Execute como Administrador.
)

echo.
pause
