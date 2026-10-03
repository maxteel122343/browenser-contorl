#!/usr/bin/env python3
"""
==============================================================
IMVU CLI AUTOMATOR - SCRIPT DE LINHA DE COMANDO
==============================================================
Permite executar a automação completa do IMVU diretamente pelo terminal.

Exemplos de Uso:
    python bot.py --room https://www.imvu.com/next/chat/room-12345-67890
    python bot.py --room https://www.imvu.com/next/chat/room-12345-67890 --headless
    python bot.py --config custom_config.yml --room https://www.imvu.com/next/chat/room-XXXXX
    python bot.py --username meu_avatar --password minha_senha --room https://...
==============================================================
"""

import os
import sys
import argparse

# Verificação amigável de dependências antes da execução
try:
    import yaml
except ImportError:
    print("\n❌ [ERRO] O módulo 'pyyaml' não está instalado.")
    print("👉 Por favor, execute no seu terminal: pip install -r requirements.txt\n")
    sys.exit(1)

try:
    from imvu_automator import IMVUAutomator
except ImportError as e:
    print(f"\n❌ [ERRO] Dependência ausente: {e}")
    print("👉 Por favor, execute no seu terminal: pip install -r requirements.txt\n")
    sys.exit(1)


def load_yaml_config(path: str) -> dict:
    """Carrega dados de configuração YAML."""
    if not os.path.exists(path):
        return {}
    try:
        with open(path, "r", encoding="utf-8") as f:
            return yaml.safe_load(f) or {}
    except Exception as e:
        print(f"[AVISO] Falha ao carregar {path}: {e}")
        return {}


def main():
    parser = argparse.ArgumentParser(
        description="IMVU Browser Automation CLI - Login automático e entrada em salas 3D IMVU Next."
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
        help="Caminho para o arquivo de configuração YAML (padrão: config.yml)"
    )
    parser.add_argument(
        "--username",
        "-u",
        type=str,
        default=None,
        help="Nome de usuário ou e-mail (sobrescreve o config.yml)"
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
        help="Executar o Chrome sem interface gráfica visível (headless)"
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=None,
        help="Tempo limite (em segundos) para espera de elementos na página"
    )
    parser.add_argument(
        "--no-detach",
        action="store_true",
        help="Fechar o navegador automaticamente após o término do script"
    )

    args = parser.parse_args()

    # Carregar configurações do arquivo YAML
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
    print("🤖 IMVU AUTOMATION BOT - MODO CLI")
    print("=" * 65)
    print(f"• Usuário:    {username or '[NÃO DEFINIDO]'}")
    print(f"• Sala:       {room_url or '[NÃO DEFINIDO]'}")
    print(f"• Headless:   {headless}")
    print(f"• Timeout:    {timeout}s")
    print(f"• Manter Aberto: {keep_browser_open}")
    print("=" * 65)

    if not username or not password:
        print("\n❌ ERRO: Usuário e Senha são obrigatórios!")
        print("Defina-os no 'config.yml', variáveis de ambiente ou passe via --username e --password.")
        sys.exit(1)

    if not room_url:
        print("\n❌ ERRO: Nenhuma URL de sala especificada!")
        print("Passe o parâmetro: python bot.py --room https://www.imvu.com/next/chat/room-XXXXX")
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
            print("\n🎉 Automação finalizada com sucesso!")
            if keep_browser_open and not headless:
                print("📌 O Google Chrome está ativo e conectado. Pressione Ctrl+C para finalizar este script.")
                try:
                    # Mantém o processo CLI vivo para não matar processos órfãos se detach não for suportado pelo SO
                    import time
                    while True:
                        time.sleep(1)
                except KeyboardInterrupt:
                    print("\nSaindo do CLI.")
            sys.exit(0)
        else:
            print("\n⚠️ Falha durante a execução da automação.")
            sys.exit(1)
    except Exception as e:
        print(f"\n❌ Exceção não tratada: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
