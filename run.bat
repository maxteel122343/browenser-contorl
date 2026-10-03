@echo off
title IMVU Automation Suite - Launcher
cls
echo ========================================================
echo        IMVU BROWSER AUTOMATION SUITE
echo ========================================================
echo Verificando instalacao do Python...

python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERRO] Python nao foi encontrado no sistema!
    echo Instale o Python 3.10+ em https://www.python.org/ e marque "Add Python to PATH".
    pause
    exit /b 1
)

echo Instalando / atualizando dependencias necessarias...
pip install -r requirements.txt

echo.
echo Iniciando Interface Grafica (CustomTkinter)...
python app.py

pause
