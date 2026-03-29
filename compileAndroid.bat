@echo off
set APP_ENV=production
cd android
.\gradlew assembleRelease
cd ..