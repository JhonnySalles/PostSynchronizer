@echo off
setlocal

echo.
echo ===================================================
echo              Compilando o app móvel!
echo ===================================================
echo.

set APP_ENV=production
cd android
.\gradlew assembleRelease
cd ..
