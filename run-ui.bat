@echo off
title clik-screenshots UI

if "%~1"=="" (
    echo.
    echo   Select your clik-screenshots.config.js file...
    echo.
    for /f "delims=" %%I in ('powershell -NoProfile -Command "Add-Type -AssemblyName System.Windows.Forms; $f = New-Object System.Windows.Forms.OpenFileDialog; $f.Filter = 'Config files (*.js)|*.js|All files (*.*)|*.*'; $f.Title = 'Select clik-screenshots config'; if ($f.ShowDialog() -eq 'OK') { $f.FileName }"') do set "CONFIG_PATH=%%I"
) else (
    set "CONFIG_PATH=%~1"
)

if "%CONFIG_PATH%"=="" (
    echo   No config file selected.
    pause
    exit /b 1
)

:: Kill any existing process on port 3456
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 3456 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }" 2>nul

echo.
echo   Starting clik-screenshots UI on http://localhost:3456
echo   Config: %CONFIG_PATH%
echo.

node "%~dp0bin\cli.js" ui --port 3456 --config "%CONFIG_PATH%"

pause
