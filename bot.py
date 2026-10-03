#!/usr/bin/env python3
"""
==============================================================
IMVU CLI AUTOMATOR - SCRIPT DE LINHA DE COMANDO
==============================================================
Permite executar a automacao completa do IMVU diretamente pelo terminal.
Compativel com Windows cp1252 / UTF-8 sem emojis para evitar UnicodeEncodeError.

Exemplos de Uso:
    python bot.py --room https://www.imvu.com/next/chat/room-12345-67890
    python bot.py --room https://www.imvu.com/next/chat/room-12345-67890 --headless
    python bot.py --config custom_config.yml --room https://www.imvu.com/next/chat/room-XXXXX
    python bot.py --username meu_avatar --password minha_senha --room https://...
==============================================================
"""

import os
import sys
import re
import argparse

# Forcar UTF-8 no stdout/stderr no Windows (evita UnicodeEncodeError em consoles cp1252/cp850)
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")


def load_yaml_config(path: str) -> dict:
    """Carrega dados de configuracao com PyYAML ou fallback regex simples."""
    if not os.path.exists(path):
        return {}

    # Tentativa com PyYAML
    try:
        import yaml
        with open(path, "r", encoding="utf-8") as f:
            return yaml.safe_load(f) or {}
    except ImportError:
        pass
    except Exception as e:
        print(f"[AVISO] Falha ao carregar {path} via yaml: {e}")

    # Fallback simples sem depender de bibliotecas externas
    config = {"imvu": {}, "automation": {}}
    current_section = None
    try:
        with open(path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                if line.endswith(":"):
                    current_section = line[:-1].strip()
                    continue
                if ":" in line:
                    k, v = line.split(":", 1)
                    k = k.strip()
                    v = v.strip().strip('"').strip("'")
                    if v.lower() == "true":
                        val = True
                    elif v.lower() == "false":
                        val = False
                    elif v.isdigit():
                        val = int(v)
                    else:
                        val = v

                    if current_section and current_section in config:
                        config[current_section][k] = val
                    else:
                        config[k] = val
    except Exception:
        pass

    return config


def main():
    parser = argparse.ArgumentParser(
        description="IMVU Browser Automation CLI - Login automatico e entrada em salas 3D IMVU Next."
    )
    parser.add_argument(
        "--room",
        "-r",
        type=str,
        default=None,
        help="URL completa da sala de chat do IMVU (ex: https://www.imvu.com/next/chat/room-...)"
    )
    parser.add_argument(
        "--config",
        "-c",
        type=str,
        default="config.yml",
        help="Caminho para o arquivo de configuracao YAML (padrao: config.yml)"
    )
    parser.add_argument(
        "--username",
        "-u",
        type=str,
        default=None,
        help="Nome de usuario ou e-mail (sobrescreve o config.yml)"
    )
    parser.add_argument(
        "--password",
        "-p",
        type=str,
        default=None,
        help="Senha do IMVU (sobrescreve o config.yml)"
    )
    parser.add_argument(
        "--headless",
        action="store_true",
        help="Executar o Chrome sem interface grafica visivel (headless)"
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=None,
        help="Tempo limite (em segundos) para espera de elementos na pagina"
    )
    parser.add_argument(
        "--no-detach",
        action="store_true",
        help="Fechar o navegador automaticamente apos o termino do script"
    )

    args = parser.parse_args()

    # Carregar configuracoes do arquivo YAML
    cfg = load_yaml_config(args.config)
    imvu_cfg = cfg.get("imvu", {})
    auto_cfg = cfg.get("automation", {})

    username = args.username or imvu_cfg.get("username") or os.getenv("IMVU_USERNAME")
    password = args.password or imvu_cfg.get("password") or os.getenv("IMVU_PASSWORD")
    room_url = args.room or imvu_cfg.get("default_room_url") or os.getenv("IMVU_ROOM_URL")
    timeout = args.timeout or auto_cfg.get("timeout", 25)
    headless = args.headless or auto_cfg.get("headless", False)
    keep_browser_open = not args.no_detach

    print("=" * 65)
    print("[IMVU AUTOMATION BOT - MODO CLI]")
    print("=" * 65)
    print(f"- Usuario:       {username or '[NAO DEFINIDO]'}")
    print(f"- Sala:          {room_url or '[NAO DEFINIDO]'}")
    print(f"- Headless:      {headless}")
    print(f"- Timeout:       {timeout}s")
    print(f"- Manter Aberto: {keep_browser_open}")
    print("=" * 65)

    if not username or not password:
        print("\n[ERRO] Usuario e Senha sao obrigatorios!")
        print("Defina-os no 'config.yml', variaveis de ambiente ou passe via --username e --password.")
        sys.exit(1)

    if not room_url:
        print("\n[ERRO] Nenhuma URL de sala especificada!")
        print("Passe o parametro: python bot.py --room https://www.imvu.com/next/chat/room-XXXXX")
        sys.exit(1)

    # Importacao da engine de automacao
    try:
        from imvu_automator import IMVUAutomator
    except ImportError as e:
        print(f"\n[ERRO] Dependencia ausente ao importar imvu_automator: {e}")
        print("Por favor, execute: pip install -r requirements.txt\n")
        sys.exit(1)

    automator = IMVUAutomator(
        username=username,
        password=password,
        room_url=room_url,
        timeout=timeout,
        headless=headless,
        keep_browser_open=keep_browser_open
    )

    try:
        success = automator.run_full_pipeline()
        if success:
            print("\n[OK] Automacao finalizada com sucesso!")
            if keep_browser_open and not headless:
                print("[INFO] O Google Chrome esta ativo e conectado. Pressione Ctrl+C para finalizar este script.")
                try:
                    import time
                    while True:
                        time.sleep(1)
                except KeyboardInterrupt:
                    print("\n[INFO] Encerrando processo CLI.")
            sys.exit(0)
        else:
            print("\n[ERRO] Falha durante a execucao da automacao.")
            sys.exit(1)
    except Exception as e:
        print(f"\n[ERRO] Excecao nao tratada: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
