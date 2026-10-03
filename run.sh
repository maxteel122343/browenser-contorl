#!/usr/bin/env bash
set -e

echo "========================================================"
echo "       IMVU BROWSER AUTOMATION SUITE"
echo "========================================================"

if ! command -v python3 &> /dev/null; then
    echo "[ERRO] Python 3 não encontrado!"
    exit 1
fi

echo "Instalando / verificando dependências em requirements.txt..."
python3 -m pip install -r requirements.txt

echo ""
echo "Iniciando interface gráfica (app.py)..."
python3 app.py
