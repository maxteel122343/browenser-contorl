#!/usr/bin/env python3
"""
==============================================================
IMVU AUTOMATION SUITE - INTERFACE GRÁFICA (CustomTkinter / Tkinter)
==============================================================
Aplicação desktop com interface gráfica para automação de navegador
no IMVU utilizando Selenium WebDriver.

Recursos:
- Carregamento e salvamento automático do arquivo `config.yml`.
- Execução assíncrona em segundo plano (multi-thread) sem congelar a interface.
- Caixa de log em tempo real com níveis [INFO], [SUCCESS], [WARNING], [ERROR].
- Botões de início rápido e fechamento sob demanda da janela do Chrome.
- Suporte a fallback automático caso CustomTkinter ainda não esteja instalado.
==============================================================
"""

import os
import sys
import threading
import queue
from datetime import datetime
from typing import Optional

try:
    import yaml
except ImportError:
    print("\n❌ [ERRO] O módulo 'pyyaml' não está instalado.")
    print("👉 Por favor, execute no seu terminal: pip install -r requirements.txt\n")
    sys.exit(1)

# Importação da engine de automação
try:
    from imvu_automator import IMVUAutomator
except ImportError as e:
    print(f"\n❌ [ERRO] Dependência ausente ao importar imvu_automator: {e}")
    print("👉 Por favor, execute no seu terminal: pip install -r requirements.txt\n")
    sys.exit(1)

# Tentativa de carregar CustomTkinter com fallback para Tkinter padrão
try:
    import customtkinter as ctk
    USE_CUSTOM_TK = True
except ImportError:
    USE_CUSTOM_TK = False
    import tkinter as ctk
    from tkinter import ttk, messagebox


CONFIG_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "config.yml")


def load_config() -> dict:
    """Carrega as configurações do config.yml ou cria valores padrão."""
    default_config = {
        "imvu": {
            "username": "",
            "password": "",
            "default_room_url": "https://www.imvu.com/next/chat/room-12345-67890"
        },
        "automation": {
            "timeout": 25,
            "keep_browser_open": True,
            "headless": False,
            "user_agent": ""
        }
    }

    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                data = yaml.safe_load(f) or {}
                if "imvu" in data:
                    default_config["imvu"].update(data.get("imvu", {}))
                if "automation" in data:
                    default_config["automation"].update(data.get("automation", {}))
        except Exception as e:
            print(f"Aviso: Não foi possível ler {CONFIG_FILE}: {e}")

    return default_config


def save_config(username: str, password: str, room_url: str, headless: bool = False):
    """Salva as configurações atualizadas no config.yml."""
    config = load_config()
    config["imvu"]["username"] = username
    config["imvu"]["password"] = password
    config["imvu"]["default_room_url"] = room_url
    config["automation"]["headless"] = headless

    try:
        with open(CONFIG_FILE, "w", encoding="utf-8") as f:
            yaml.dump(config, f, default_flow_style=False, allow_unicode=True)
    except Exception as e:
        print(f"Erro ao salvar config.yml: {e}")


class IMVUGuiApp:
    def __init__(self):
        self.config = load_config()
        self.automator: Optional[IMVUAutomator] = None
        self.is_running = False
        self.log_queue = queue.Queue()

        if USE_CUSTOM_TK:
            ctk.set_appearance_mode("Dark")
            ctk.set_default_color_theme("blue")
            self.root = ctk.CTk()
        else:
            self.root = ctk.Tk()

        self.root.title("IMVU Browser Automator - Selenium")
        self.root.geometry("820x680")
        self.root.minsize(700, 580)

        self._build_ui()
        self._start_log_consumer()

    def _build_ui(self):
        """Monta os componentes visuais da aplicação."""
        if USE_CUSTOM_TK:
            self._build_custom_ui()
        else:
            self._build_standard_ui()

    def _build_custom_ui(self):
        """Montagem usando CustomTkinter moderno e escuro."""
        # Top Header
        header_frame = ctk.CTkFrame(self.root, corner_radius=10, fg_color="#18181b")
        header_frame.pack(fill="x", padx=16, pady=(16, 10))

        title = ctk.CTkLabel(
            header_frame,
            text="IMVU Browser Automation",
            font=ctk.CTkFont(size=22, weight="bold"),
            text_color="#60a5fa"
        )
        title.pack(anchor="w", padx=16, pady=(12, 2))

        subtitle = ctk.CTkLabel(
            header_frame,
            text="Automação fim-a-fim de login e entrada imediata em salas 3D do IMVU Next",
            font=ctk.CTkFont(size=12),
            text_color="#94a3b8"
        )
        subtitle.pack(anchor="w", padx=16, pady=(0, 12))

        # Form Frame
        form_frame = ctk.CTkFrame(self.root, corner_radius=10, fg_color="#1e1e24")
        form_frame.pack(fill="x", padx=16, pady=6)

        # Room URL
        lbl_room = ctk.CTkLabel(form_frame, text="URL da Sala IMVU (Next Chat):", font=ctk.CTkFont(weight="bold"))
        lbl_room.grid(row=0, column=0, sticky="w", padx=16, pady=(12, 4))
        self.entry_room = ctk.CTkEntry(
            form_frame,
            placeholder_text="https://www.imvu.com/next/chat/room-XXXXX-XXXX",
            height=36
        )
        self.entry_room.grid(row=0, column=1, columnspan=2, sticky="ew", padx=16, pady=(12, 4))
        self.entry_room.insert(0, self.config["imvu"].get("default_room_url", ""))

        # Credentials row
        lbl_user = ctk.CTkLabel(form_frame, text="Usuário / E-mail:", font=ctk.CTkFont(weight="bold"))
        lbl_user.grid(row=1, column=0, sticky="w", padx=16, pady=6)
        self.entry_user = ctk.CTkEntry(form_frame, placeholder_text="Seu Avatar Name ou E-mail", height=36)
        self.entry_user.grid(row=1, column=1, columnspan=2, sticky="ew", padx=16, pady=6)
        self.entry_user.insert(0, self.config["imvu"].get("username", ""))

        lbl_pass = ctk.CTkLabel(form_frame, text="Senha do IMVU:", font=ctk.CTkFont(weight="bold"))
        lbl_pass.grid(row=2, column=0, sticky="w", padx=16, pady=(6, 12))
        self.entry_pass = ctk.CTkEntry(form_frame, placeholder_text="Sua Senha", show="*", height=36)
        self.entry_pass.grid(row=2, column=1, columnspan=2, sticky="ew", padx=16, pady=(6, 12))
        self.entry_pass.insert(0, self.config["imvu"].get("password", ""))

        form_frame.grid_columnconfigure(1, weight=1)

        # Options row
        opt_frame = ctk.CTkFrame(self.root, fg_color="transparent")
        opt_frame.pack(fill="x", padx=16, pady=4)

        self.var_headless = ctk.BooleanVar(value=self.config["automation"].get("headless", False))
        chk_headless = ctk.CTkCheckBox(
            opt_frame,
            text="Modo Headless (Invisível)",
            variable=self.var_headless
        )
        chk_headless.pack(side="left", padx=4)

        btn_save = ctk.CTkButton(
            opt_frame,
            text="💾 Salvar Config",
            width=120,
            fg_color="#334155",
            hover_color="#475569",
            command=self._on_save_config
        )
        btn_save.pack(side="right", padx=4)

        # Big Action Buttons
        btn_frame = ctk.CTkFrame(self.root, fg_color="transparent")
        btn_frame.pack(fill="x", padx=16, pady=10)

        self.btn_start = ctk.CTkButton(
            btn_frame,
            text="🚀 INICIAR AUTOMAÇÃO & ABRIR NAVEGADOR",
            height=48,
            font=ctk.CTkFont(size=14, weight="bold"),
            fg_color="#2563eb",
            hover_color="#1d4ed8",
            command=self._on_start_automation
        )
        self.btn_start.pack(side="left", fill="x", expand=True, padx=(0, 8))

        self.btn_stop = ctk.CTkButton(
            btn_frame,
            text="🛑 PARAR / FECHAR NAVEGADOR",
            height=48,
            font=ctk.CTkFont(size=14, weight="bold"),
            fg_color="#dc2626",
            hover_color="#b91c1c",
            command=self._on_stop_browser,
            state="disabled"
        )
        self.btn_stop.pack(side="right", fill="x", expand=True, padx=(8, 0))

        # Log Console Box
        log_header = ctk.CTkLabel(
            self.root,
            text="Terminal de Status e Logs da Automação:",
            font=ctk.CTkFont(size=12, weight="bold"),
            text_color="#cbd5e1"
        )
        log_header.pack(anchor="w", padx=16, pady=(6, 2))

        self.txt_logs = ctk.CTkTextbox(
            self.root,
            corner_radius=8,
            font=ctk.CTkFont(family="Consolas", size=12),
            fg_color="#09090b",
            text_color="#f8fafc"
        )
        self.txt_logs.pack(fill="both", expand=True, padx=16, pady=(0, 16))

    def _build_standard_ui(self):
        """Montagem de fallback usando Tkinter padrão."""
        import tkinter as tk
        top_frame = tk.Frame(self.root, bg="#1e293b", padx=12, pady=10)
        top_frame.pack(fill="x")

        tk.Label(
            top_frame,
            text="IMVU Browser Automation (Modo Tkinter Padrão)",
            font=("Arial", 16, "bold"),
            bg="#1e293b",
            fg="#38bdf8"
        ).pack(anchor="w")

        form = tk.Frame(self.root, padx=12, pady=8)
        form.pack(fill="x")

        tk.Label(form, text="URL da Sala:", font=("Arial", 10, "bold")).grid(row=0, column=0, sticky="w", pady=4)
        self.entry_room = tk.Entry(form, width=60)
        self.entry_room.grid(row=0, column=1, sticky="ew", pady=4)
        self.entry_room.insert(0, self.config["imvu"].get("default_room_url", ""))

        tk.Label(form, text="Usuário:", font=("Arial", 10, "bold")).grid(row=1, column=0, sticky="w", pady=4)
        self.entry_user = tk.Entry(form, width=60)
        self.entry_user.grid(row=1, column=1, sticky="ew", pady=4)
        self.entry_user.insert(0, self.config["imvu"].get("username", ""))

        tk.Label(form, text="Senha:", font=("Arial", 10, "bold")).grid(row=2, column=0, sticky="w", pady=4)
        self.entry_pass = tk.Entry(form, show="*", width=60)
        self.entry_pass.grid(row=2, column=1, sticky="ew", pady=4)
        self.entry_pass.insert(0, self.config["imvu"].get("password", ""))

        form.grid_columnconfigure(1, weight=1)

        btn_box = tk.Frame(self.root, padx=12, pady=6)
        btn_box.pack(fill="x")

        self.btn_start = tk.Button(
            btn_box,
            text="INICIAR AUTOMAÇÃO & ABRIR NAVEGADOR",
            bg="#0284c7",
            fg="white",
            font=("Arial", 11, "bold"),
            height=2,
            command=self._on_start_automation
        )
        self.btn_start.pack(side="left", fill="x", expand=True, padx=4)

        self.btn_stop = tk.Button(
            btn_box,
            text="PARAR / FECHAR NAVEGADOR",
            bg="#e11d48",
            fg="white",
            font=("Arial", 11, "bold"),
            height=2,
            command=self._on_stop_browser,
            state="disabled"
        )
        self.btn_stop.pack(side="right", fill="x", expand=True, padx=4)

        self.txt_logs = tk.Text(self.root, bg="#0f172a", fg="#f8fafc", font=("Consolas", 10), height=14)
        self.txt_logs.pack(fill="both", expand=True, padx=12, pady=8)

    def log(self, message: str, level: str = "INFO"):
        """Envia mensagem para a fila thread-safe de logs."""
        self.log_queue.put((message, level))

    def _start_log_consumer(self):
        """Consome mensagens da fila e atualiza o widget de texto na thread da UI."""
        try:
            while not self.log_queue.empty():
                msg, level = self.log_queue.get_nowait()
                timestamp = datetime.now().strftime("%H:%M:%S")
                icon = {
                    "INFO": "ℹ️",
                    "SUCCESS": "✅",
                    "WARNING": "⚠️",
                    "ERROR": "❌",
                    "DEBUG": "🔍"
                }.get(level, "•")

                line = f"[{timestamp}] {icon} [{level}] {msg}\n"

                if USE_CUSTOM_TK:
                    self.txt_logs.insert("end", line)
                    self.txt_logs.see("end")
                else:
                    self.txt_logs.insert("end", line)
                    self.txt_logs.see("end")
        except Exception:
            pass

        self.root.after(100, self._start_log_consumer)

    def _on_save_config(self):
        """Salva os valores preenchidos no config.yml."""
        user = self.entry_user.get().strip()
        pwd = self.entry_pass.get().strip()
        room = self.entry_room.get().strip()
        headless = self.var_headless.get() if USE_CUSTOM_TK else False
        save_config(user, pwd, room, headless)
        self.log("Configurações salvas em config.yml com sucesso.", "SUCCESS")

    def _on_start_automation(self):
        """Dispara a automação em uma thread separada para não congelar o Tkinter."""
        user = self.entry_user.get().strip()
        pwd = self.entry_pass.get().strip()
        room = self.entry_room.get().strip()

        if not user or not pwd:
            self.log("Atenção: Usuário e Senha são obrigatórios para realizar o login no IMVU.", "WARNING")
            return

        if not room:
            self.log("Atenção: A URL da sala não foi preenchida.", "WARNING")

        # Salva automaticamente antes de iniciar
        self._on_save_config()

        self.btn_start.configure(state="disabled")
        self.btn_stop.configure(state="normal")
        self.is_running = True

        self.log("Iniciando processo de automação em segundo plano...", "INFO")

        headless = self.var_headless.get() if USE_CUSTOM_TK else False
        timeout = int(self.config["automation"].get("timeout", 25))

        self.automator = IMVUAutomator(
            username=user,
            password=pwd,
            room_url=room,
            timeout=timeout,
            headless=headless,
            keep_browser_open=True,
            log_callback=self.log
        )

        # Thread de execução em segundo plano
        thread = threading.Thread(target=self._run_automation_thread, daemon=True)
        thread.start()

    def _run_automation_thread(self):
        """Método executado na thread de trabalho."""
        try:
            success = self.automator.run_full_pipeline()
            if success:
                self.log("Operação finalizada com sucesso! Sessão ativa no Chrome.", "SUCCESS")
            else:
                self.log("A automação encontrou erros durante a execução.", "ERROR")
        except Exception as e:
            self.log(f"Exceção fatal na automação: {str(e)}", "ERROR")
        finally:
            self.root.after(0, self._reset_ui_state)

    def _reset_ui_state(self):
        """Restaura o estado dos botões após término ou erro."""
        self.btn_start.configure(state="normal")
        # Mantém btn_stop ativo se o driver ainda estiver aberto
        if self.automator and self.automator.driver:
            self.btn_stop.configure(state="normal")
        else:
            self.btn_stop.configure(state="disabled")
        self.is_running = False

    def _on_stop_browser(self):
        """Fecha a janela do Chrome imediatamente."""
        if self.automator:
            self.log("Comando recebido: Encerrando navegador...", "WARNING")
            self.automator.close()
            self.btn_stop.configure(state="disabled")
            self.btn_start.configure(state="normal")

    def run(self):
        """Inicia o loop principal da aplicação gráfica."""
        self.log("Aplicativo iniciado. Pronto para automação.", "INFO")
        self.root.mainloop()


if __name__ == "__main__":
    app = IMVUGuiApp()
    app.run()
