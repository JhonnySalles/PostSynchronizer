@echo off
setlocal

echo.
echo ===================================================
echo     Compilando e Enviando para o Firebase App Dist
echo ===================================================
echo.

:: Garantir que o ambiente seja produção para a build
set APP_ENV=production

echo [1/2] Entrando na pasta android e iniciando compilação...
cd android

:: Executa a limpeza e a compilação do APK de release seguido do upload
:: Nota: Se falhar aqui por falta de login, execute 'firebase login' no seu terminal.
call .\gradlew assembleRelease appDistributionUploadRelease

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERRO] Ocorreu um problema na compilação ou no envio.
    echo Certifique-se de que voce esta logado no Firebase CLI (firebase login).
    cd ..
    pause
    exit /b %ERRORLEVEL%
)

cd ..

echo.
echo ===================================================
echo     Processo concluido com sucesso!
echo     O app ja deve estar disponivel no Firebase.
echo ===================================================
echo.
pause
