@echo off
setlocal

echo.
echo ===================================================
echo              Iniciando os testes!
echo ===================================================
echo.

:: # Rodar todos os testes (Suite Completa)
:: yarn test

:: # Rodar em tempo real (Modo Observação)
:: yarn test:watch

:: # Gerar relatório de cobertura (Code Coverage)
:: yarn test:coverage

yarn test


