@echo off
if "%1"=="prod" (
  echo Switching to production environment
  copy .env.production .env
) else if "%1"=="dev" (
  echo Switching to development environment
  copy .env.development .env
) else (
  echo Usage: switch_env.bat [dev^|prod]
  exit /b 1
)