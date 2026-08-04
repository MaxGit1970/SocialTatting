@echo off
setlocal
cd /d "%~dp0"
where npm >nul 2>nul
if errorlevel 1 (
  echo Node.js non e' installato o npm non e' disponibile nel PATH.
  echo Scarica Node.js da https://nodejs.org/
  pause
  exit /b 1
)
if not exist node_modules (
  echo Installazione delle dipendenze...
  call npm install
  if errorlevel 1 (
    echo Installazione non riuscita.
    pause
    exit /b 1
  )
)
call npm run dev -- --open
endlocal
