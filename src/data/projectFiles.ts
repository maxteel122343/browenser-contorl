export interface ProjectFile {
  name: string;
  path: string;
  language: string;
  description: string;
  content: string;
}

export const PROJECT_FILES: ProjectFile[] = [
  {
    name: "app.py",
    path: "app.py",
    language: "python",
    description: "Interface Grafica Desktop (CustomTkinter) com logs em tempo real e automacao em thread separada",
    content: `#!/usr/bin/env python3
"""
==============================================================
IMVU AUTOMATION SUITE - INTERFACE GRAFICA (CustomTkinter / Tkinter)
==============================================================
Aplicacao desktop com interface grafica para automacao de navegador
no IMVU utilizando Selenium WebDriver.

Recursos:
- Forca UTF-8 no stdout/stderr no Windows.
- Logs estritamente ASCII ([INFO], [OK], [AVISO], [ERRO]) sem emojis.
- Carregamento e salvamento automatico do arquivo \`config.yml\`.
- Execucao assincrona em segundo plano (multi-thread) sem congelar a interface.
- Botoes de inicio rapido e fechamento sob demanda da janela do Chrome.
- Suporte a fallback automatico caso CustomTkinter nao esteja instalado.
==============================================================
"""

import os
import sys
import threading
import queue
from datetime import datetime
from typing import Optional

# Forcar UTF-8 no stdout/stderr no Windows (evita UnicodeEncodeError em consoles cp1252/cp850)
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

os.environ["PYTHONIOENCODING"] = "utf-8"
os.environ["PYTHONUTF8"] = "1"

try:
    import yaml
except ImportError:
    print("\\n[ERRO] O modulo 'pyyaml' nao esta instalado.")
    print("Execute no seu terminal: pip install -r requirements.txt\\n")
    sys.exit(1)

# Importacao da engine de automacao
try:
    from imvu_automator import IMVUAutomator
except ImportError as e:
    print(f"\\n[ERRO] Dependencia ausente ao importar imvu_automator: {e}")
    print("Execute no seu terminal: pip install -r requirements.txt\\n")
    sys.exit(1)

# Tentativa de carregar CustomTkinter com fallback para Tkinter padrao
try:
    import customtkinter as ctk
    USE_CUSTOM_TK = True
except ImportError:
    USE_CUSTOM_TK = False
    import tkinter as ctk
    from tkinter import ttk, messagebox


CONFIG_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "config.yml")


def load_config() -> dict:
    """Carrega as configuracoes do config.yml ou cria valores padrao."""
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
            print(f"[AVISO] Nao foi possivel ler {CONFIG_FILE}: {e}")

    return default_config


def save_config(username: str, password: str, room_url: str, headless: bool = False):
    """Salva as configuracoes atualizadas no config.yml."""
    config = load_config()
    config["imvu"]["username"] = username
    config["imvu"]["password"] = password
    config["imvu"]["default_room_url"] = room_url
    config["automation"]["headless"] = headless

    try:
        with open(CONFIG_FILE, "w", encoding="utf-8") as f:
            yaml.dump(config, f, default_flow_style=False, allow_unicode=True)
    except Exception as e:
        print(f"[ERRO] Falha ao salvar config.yml: {e}")


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
        """Monta os componentes visuais da aplicacao."""
        if USE_CUSTOM_TK:
            self._build_custom_ui()
        else:
            self._build_standard_ui()

    def _build_custom_ui(self):
        """Montagem usando CustomTkinter."""
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
            text="Automacao de login e entrada imediata em salas 3D do IMVU Next",
            font=ctk.CTkFont(size=12),
            text_color="#94a3b8"
        )
        subtitle.pack(anchor="w", padx=16, pady=(0, 12))

        form_frame = ctk.CTkFrame(self.root, corner_radius=10, fg_color="#1e1e24")
        form_frame.pack(fill="x", padx=16, pady=6)

        lbl_room = ctk.CTkLabel(form_frame, text="URL da Sala IMVU (Next Chat):", font=ctk.CTkFont(weight="bold"))
        lbl_room.grid(row=0, column=0, sticky="w", padx=16, pady=(12, 4))
        self.entry_room = ctk.CTkEntry(
            form_frame,
            placeholder_text="https://www.imvu.com/next/chat/room-XXXXX-XXXX",
            height=36
        )
        self.entry_room.grid(row=0, column=1, columnspan=2, sticky="ew", padx=16, pady=(12, 4))
        self.entry_room.insert(0, self.config["imvu"].get("default_room_url", ""))

        lbl_user = ctk.CTkLabel(form_frame, text="Usuario / E-mail:", font=ctk.CTkFont(weight="bold"))
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

        opt_frame = ctk.CTkFrame(self.root, fg_color="transparent")
        opt_frame.pack(fill="x", padx=16, pady=4)

        self.var_headless = ctk.BooleanVar(value=self.config["automation"].get("headless", False))
        chk_headless = ctk.CTkCheckBox(
            opt_frame,
            text="Modo Headless (Invisivel)",
            variable=self.var_headless
        )
        chk_headless.pack(side="left", padx=4)

        btn_save = ctk.CTkButton(
            opt_frame,
            text="Salvar Config",
            width=120,
            fg_color="#334155",
            hover_color="#475569",
            command=self._on_save_config
        )
        btn_save.pack(side="right", padx=4)

        btn_frame = ctk.CTkFrame(self.root, fg_color="transparent")
        btn_frame.pack(fill="x", padx=16, pady=10)

        self.btn_start = ctk.CTkButton(
            btn_frame,
            text="INICIAR AUTOMACAO & ABRIR NAVEGADOR",
            height=48,
            font=ctk.CTkFont(size=14, weight="bold"),
            fg_color="#2563eb",
            hover_color="#1d4ed8",
            command=self._on_start_automation
        )
        self.btn_start.pack(side="left", fill="x", expand=True, padx=(0, 8))

        self.btn_stop = ctk.CTkButton(
            btn_frame,
            text="PARAR / FECHAR NAVEGADOR",
            height=48,
            font=ctk.CTkFont(size=14, weight="bold"),
            fg_color="#dc2626",
            hover_color="#b91c1c",
            command=self._on_stop_browser,
            state="disabled"
        )
        self.btn_stop.pack(side="right", fill="x", expand=True, padx=(8, 0))

        log_header = ctk.CTkLabel(
            self.root,
            text="Terminal de Status e Logs da Automacao:",
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
        """Montagem de fallback usando Tkinter padrao."""
        import tkinter as tk
        top_frame = tk.Frame(self.root, bg="#1e293b", padx=12, pady=10)
        top_frame.pack(fill="x")

        tk.Label(
            top_frame,
            text="IMVU Browser Automation (Modo Tkinter Padrao)",
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

        tk.Label(form, text="Usuario:", font=("Arial", 10, "bold")).grid(row=1, column=0, sticky="w", pady=4)
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
            text="INICIAR AUTOMACAO & ABRIR NAVEGADOR",
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
                lvl = level.upper()
                if lvl in ("SUCCESS", "OK"):
                    tag = "[OK]"
                elif lvl in ("ERROR", "ERRO"):
                    tag = "[ERRO]"
                elif lvl in ("WARNING", "AVISO"):
                    tag = "[AVISO]"
                elif lvl == "DEBUG":
                    tag = "[DEBUG]"
                else:
                    tag = "[INFO]"

                line = f"[{timestamp}] {tag} {msg}\\n"
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
        self.log("Configuracoes salvas em config.yml com sucesso.", "OK")

    def _on_start_automation(self):
        """Dispara a automacao em uma thread separada para nao congelar a interface."""
        user = self.entry_user.get().strip()
        pwd = self.entry_pass.get().strip()
        room = self.entry_room.get().strip()

        if not user or not pwd:
            self.log("Usuario e Senha sao obrigatorios para o login no IMVU.", "AVISO")
            return

        if not room:
            self.log("A URL da sala nao foi preenchida.", "AVISO")

        self._on_save_config()

        self.btn_start.configure(state="disabled")
        self.btn_stop.configure(state="normal")
        self.is_running = True

        self.log("Iniciando processo de automacao em segundo plano...", "INFO")

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

        thread = threading.Thread(target=self._run_automation_thread, daemon=True)
        thread.start()

    def _run_automation_thread(self):
        """Metodo executado na thread de trabalho."""
        try:
            success = self.automator.run_full_pipeline()
            if success:
                self.log("Operacao finalizada com sucesso! Sessao ativa no Chrome.", "OK")
            else:
                self.log("A automacao encontrou erros durante a execucao.", "ERRO")
        except Exception as e:
            self.log(f"Excecao fatal na automacao: {str(e)}", "ERRO")
        finally:
            self.root.after(0, self._reset_ui_state)

    def _reset_ui_state(self):
        """Restaura o estado dos botoes apos termino ou erro."""
        self.btn_start.configure(state="normal")
        if self.automator and self.automator.driver:
            self.btn_stop.configure(state="normal")
        else:
            self.btn_stop.configure(state="disabled")
        self.is_running = False

    def _on_stop_browser(self):
        """Fecha a janela do Chrome imediatamente."""
        if self.automator:
            self.log("Comando recebido: Encerrando navegador...", "AVISO")
            self.automator.close()
            self.btn_stop.configure(state="disabled")
            self.btn_start.configure(state="normal")

    def run(self):
        """Inicia o loop principal da aplicacao grafica."""
        self.log("Aplicativo iniciado. Pronto para automacao.", "INFO")
        self.root.mainloop()


if __name__ == "__main__":
    app = IMVUGuiApp()
    app.run()
`
  },
  {
    name: "imvu_automator.py",
    path: "imvu_automator.py",
    language: "python",
    description: "Motor Selenium WebDriver resiliente com esperas explicitas, bypass anti-bot, login e clique JOIN",
    content: `"""
==============================================================
MOTOR DE AUTOMACAO IMVU COM SELENIUM WEBDRIVER
==============================================================
Modulo responsavel por:
1. Inicializar o Google Chrome (Selenium Manager / webdriver-manager).
2. Navegar para a pagina de login do IMVU.
3. Preencher credenciais e submeter o formulario de login.
4. Tratar banners de cookies (OneTrust / GDPR) e termos.
5. Redirecionar para a sala 3D do IMVU Next (chat/room-...).
6. Clicar automaticamente no botao 'JOIN' / 'Entrar'.
7. Manter a sessao aberta e interativa com a opcao 'detach=True'.
8. Saida estrita em UTF-8 sem emojis para compatibilidade cp1252.
==============================================================
"""

import os
import sys
import time
from typing import Callable, Optional

# Forcar UTF-8 no stdout/stderr no Windows (evita UnicodeEncodeError em consoles cp1252/cp850)
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

# Selenium imports
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import (
    TimeoutException,
    NoSuchElementException,
    ElementClickInterceptedException,
    WebDriverException
)

# Gerenciador opcional webdriver-manager
try:
    from webdriver_manager.chrome import ChromeDriverManager
except ImportError:
    ChromeDriverManager = None


class IMVUAutomator:
    """Controlador de automacao do IMVU usando Selenium WebDriver."""

    LOGIN_URL = "https://secure.imvu.com/welcome/login/"

    def __init__(
        self,
        username: str,
        password: str,
        room_url: str,
        timeout: int = 25,
        headless: bool = False,
        keep_browser_open: bool = True,
        user_agent: Optional[str] = None,
        log_callback: Optional[Callable[[str, str], None]] = None
    ):
        self.username = (username or "").strip()
        self.password = (password or "").strip()
        self.room_url = (room_url or "").strip()
        self.timeout = timeout
        self.headless = headless
        self.keep_browser_open = keep_browser_open
        self.user_agent = user_agent
        self.log_callback = log_callback
        self.driver: Optional[webdriver.Chrome] = None
        self._is_running = False

    def log(self, message: str, level: str = "INFO"):
        """Envia mensagem com tags ASCII estritas para evitar falhas de encoding."""
        lvl = level.upper()
        if lvl in ("SUCCESS", "OK"):
            lvl = "OK"
        elif lvl in ("ERROR", "ERRO"):
            lvl = "ERRO"
        elif lvl in ("WARNING", "AVISO"):
            lvl = "AVISO"
        elif lvl not in ("INFO", "DEBUG"):
            lvl = "INFO"

        timestamp = time.strftime("%H:%M:%S")
        formatted = f"[{timestamp}] [{lvl}] {message}"
        print(formatted, flush=True)

        if self.log_callback:
            try:
                self.log_callback(message, lvl)
            except Exception as e:
                print(f"[{timestamp}] [AVISO] Falha no log_callback: {e}", flush=True)

    def build_chrome_options(self) -> Options:
        """Configura opcoes do Chrome para estabilidade, detach e evasao anti-bot."""
        options = Options()

        if self.keep_browser_open:
            options.add_experimental_option("detach", True)

        if self.headless:
            options.add_argument("--headless=new")
            self.log("Modo Headless (sem janela visivel) ativado.", "DEBUG")
        else:
            options.add_argument("--start-maximized")

        options.add_argument("--disable-infobars")
        options.add_argument("--disable-extensions")
        options.add_argument("--disable-gpu")
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--ignore-certificate-errors")

        options.add_experimental_option("excludeSwitches", ["enable-automation"])
        options.add_experimental_option("useAutomationExtension", False)
        options.add_argument("--disable-blink-features=AutomationControlled")

        if self.user_agent:
            options.add_argument(f"user-agent={self.user_agent}")
        else:
            default_ua = (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
            )
            options.add_argument(f"user-agent={default_ua}")

        options.add_argument("--autoplay-policy=no-user-gesture-required")

        return options

    def start_driver(self) -> webdriver.Chrome:
        """Inicializa a instancia do Google Chrome com fallback automatico."""
        self.log("Preparando WebDriver do Google Chrome...", "INFO")
        options = self.build_chrome_options()
        driver = None

        try:
            driver = webdriver.Chrome(options=options)
            self.log("Chrome inicializado via Selenium Manager nativo.", "DEBUG")
        except Exception as e1:
            self.log(f"Selenium Manager nao inicializou direto ({e1}). Tentando webdriver-manager...", "DEBUG")
            if ChromeDriverManager:
                try:
                    service = Service(ChromeDriverManager().install())
                    driver = webdriver.Chrome(service=service, options=options)
                    self.log("Chrome inicializado via ChromeDriverManager.", "DEBUG")
                except Exception as e2:
                    self.log(f"Falha ao iniciar via ChromeDriverManager: {e2}", "AVISO")

        if not driver:
            driver = webdriver.Chrome(options=options)

        try:
            driver.execute_cdp_cmd(
                "Page.addScriptToEvaluateOnNewDocument",
                {
                    "source": """
                        Object.defineProperty(navigator, 'webdriver', {
                            get: () => undefined
                        });
                    """
                }
            )
        except Exception:
            pass

        self.driver = driver
        self._is_running = True
        self.log("Google Chrome aberto com sucesso!", "OK")
        return driver

    def dismiss_cookie_banner(self):
        """Disposicao automatica de banners de cookies (OneTrust / GDPR)."""
        if not self.driver:
            return

        cookie_selectors = [
            "button#onetrust-accept-btn-handler",
            "button[id*='accept-cookies']",
            "button.cookie-banner__accept",
            "//button[contains(translate(., 'ACCEPT', 'accept'), 'accept')]",
            "//button[contains(translate(., 'ACEITAR', 'aceitar'), 'aceitar')]",
            "//button[contains(translate(., 'AGREE', 'agree'), 'agree')]",
            ".optanon-allow-all"
        ]

        for selector in cookie_selectors:
            try:
                if selector.startswith("//"):
                    elem = self.driver.find_element(By.XPATH, selector)
                else:
                    elem = self.driver.find_element(By.CSS_SELECTOR, selector)

                if elem.is_displayed():
                    self.driver.execute_script("arguments[0].click();", elem)
                    self.log("Banner de cookies aceito/fechado.", "DEBUG")
                    time.sleep(0.5)
                    break
            except Exception:
                continue

    def perform_login(self) -> bool:
        """Navega para a pagina de login e efetua o login no IMVU."""
        if not self.driver:
            raise RuntimeError("Driver nao inicializado.")

        self.log(f"Navegando para a pagina de login: {self.LOGIN_URL}", "INFO")
        self.driver.get(self.LOGIN_URL)

        wait = WebDriverWait(self.driver, self.timeout)

        time.sleep(2)
        self.dismiss_cookie_banner()

        self.log("Aguardando campos de credenciais...", "INFO")

        user_selectors = [
            (By.NAME, "avatarname"),
            (By.ID, "loginavatar"),
            (By.NAME, "username"),
            (By.NAME, "email"),
            (By.CSS_SELECTOR, "input[name='avatarname']"),
            (By.CSS_SELECTOR, "input[name='username']"),
            (By.CSS_SELECTOR, "input[type='text']"),
            (By.XPATH, "//input[@placeholder='Username' or @placeholder='Avatar Name' or @placeholder='Email']")
        ]

        pass_selectors = [
            (By.NAME, "password"),
            (By.ID, "loginpassword"),
            (By.CSS_SELECTOR, "input[name='password']"),
            (By.CSS_SELECTOR, "input[type='password']"),
            (By.XPATH, "//input[@type='password']")
        ]

        user_elem = None
        for by, sel in user_selectors:
            try:
                user_elem = wait.until(EC.element_to_be_clickable((by, sel)))
                if user_elem:
                    break
            except TimeoutException:
                continue

        if not user_elem:
            self.log(f"Campo de usuario nao encontrado. URL atual: {self.driver.current_url}", "ERRO")
            raise NoSuchElementException("Nao foi possivel localizar o campo de Usuario/Avatar do IMVU.")

        pass_elem = None
        for by, sel in pass_selectors:
            try:
                pass_elem = wait.until(EC.element_to_be_clickable((by, sel)))
                if pass_elem:
                    break
            except TimeoutException:
                continue

        if not pass_elem:
            self.log(f"Campo de senha nao encontrado. URL atual: {self.driver.current_url}", "ERRO")
            raise NoSuchElementException("Nao foi possivel localizar o campo de Senha do IMVU.")

        self.log(f"Preenchendo usuario: '{self.username}'...", "INFO")
        user_elem.clear()
        user_elem.send_keys(self.username)
        time.sleep(0.3)

        self.log("Preenchendo senha...", "INFO")
        pass_elem.clear()
        pass_elem.send_keys(self.password)
        time.sleep(0.3)

        submit_selectors = [
            (By.ID, "loginsubmit"),
            (By.CSS_SELECTOR, "button[type='submit']"),
            (By.CSS_SELECTOR, "input[type='submit']"),
            (By.XPATH, "//button[contains(translate(., 'LOG IN', 'log in'), 'log in') or contains(translate(., 'ENTRAR', 'entrar'), 'entrar')]"),
            (By.XPATH, "//button[contains(@class, 'login') or contains(@class, 'submit')]")
        ]

        submitted = False
        for by, sel in submit_selectors:
            try:
                submit_elem = self.driver.find_element(by, sel)
                if submit_elem.is_displayed():
                    self.log("Clicando no botao de Login...", "INFO")
                    try:
                        submit_elem.click()
                    except ElementClickInterceptedException:
                        self.driver.execute_script("arguments[0].click();", submit_elem)
                    submitted = True
                    break
            except Exception:
                continue

        if not submitted:
            self.log("Submetendo formulario via tecla ENTER no campo de senha...", "INFO")
            pass_elem.send_keys(Keys.ENTER)

        self.log("Aguardando confirmacao de login...", "INFO")

        try:
            WebDriverWait(self.driver, 15).until(
                lambda d: (
                    "login" not in d.current_url.lower()
                    or "next" in d.current_url.lower()
                    or len(d.find_elements(By.CSS_SELECTOR, ".user-avatar, .profile-badge, [data-testid='user-avatar']")) > 0
                )
            )
            self.log(f"Login validado! URL atual: {self.driver.current_url}", "OK")
            return True
        except TimeoutException:
            error_elems = self.driver.find_elements(
                By.XPATH,
                "//*[contains(@class, 'error') or contains(@class, 'alert') or contains(text(), 'Incorrect') or contains(text(), 'Invalid')]"
            )
            found_error = False
            for err in error_elems:
                if err.is_displayed() and err.text:
                    self.log(f"Alerta na pagina de login: {err.text.strip()}", "ERRO")
                    found_error = True

            if found_error:
                raise RuntimeError("Falha de autenticacao no IMVU: Usuario ou senha incorretos.")

            self.log(f"Aviso: URL apos espera de login: {self.driver.current_url}. Prosseguindo para a sala...", "AVISO")
            return True

    def join_room(self) -> bool:
        """Navega para a sala especificada e clica no botao JOIN."""
        if not self.driver:
            raise RuntimeError("Driver nao inicializado.")

        if not self.room_url:
            self.log("Nenhuma URL de sala especificada. Mantendo navegador aberto.", "AVISO")
            return True

        self.log(f"Redirecionando para a sala do IMVU: {self.room_url}", "INFO")
        self.driver.get(self.room_url)

        time.sleep(3)
        self.dismiss_cookie_banner()

        self.log("Aguardando carregamento da interface 3D / card da sala...", "INFO")

        join_selectors = [
            (By.XPATH, "//button[contains(translate(., 'JOIN', 'join'), 'join')]"),
            (By.XPATH, "//button[contains(translate(., 'ENTRAR', 'entrar'), 'entrar')]"),
            (By.XPATH, "//button[contains(translate(., 'JOIN ROOM', 'join room'), 'join room')]"),
            (By.CSS_SELECTOR, "button.join-room-button"),
            (By.CSS_SELECTOR, "button[data-testid*='join']"),
            (By.CSS_SELECTOR, "button.room-card__join"),
            (By.CSS_SELECTOR, ".room-join-btn button, button.room-join-btn"),
            (By.XPATH, "//div[contains(@class, 'button') and (contains(., 'Join') or contains(., 'Entrar'))]")
        ]

        join_clicked = False
        start_time = time.time()

        while (time.time() - start_time) < self.timeout:
            for by, sel in join_selectors:
                try:
                    elements = self.driver.find_elements(by, sel)
                    for elem in elements:
                        if elem.is_displayed() and elem.is_enabled():
                            btn_label = elem.text.strip() or "Join"
                            self.log(f"Botao 'JOIN' localizado: '{btn_label}'. Clicando...", "INFO")
                            try:
                                self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", elem)
                                time.sleep(0.3)
                                elem.click()
                            except Exception:
                                self.driver.execute_script("arguments[0].click();", elem)

                            join_clicked = True
                            self.log("Botao JOIN clicado com sucesso!", "OK")
                            break
                    if join_clicked:
                        break
                except Exception:
                    continue

            if join_clicked:
                break
            time.sleep(1)

        try:
            confirm_btns = self.driver.find_elements(
                By.XPATH,
                "//button[contains(., 'Confirm') or contains(., 'Confirmar') or contains(., 'Continuar') or contains(., 'Yes, enter')]"
            )
            for btn in confirm_btns:
                if btn.is_displayed():
                    self.log("Modal de confirmacao detectado. Confirmando entrada...", "INFO")
                    self.driver.execute_script("arguments[0].click();", btn)
                    time.sleep(1)
                    break
        except Exception:
            pass

        current_url = self.driver.current_url
        page_title = self.driver.title or "[Sem Titulo]"

        if not join_clicked:
            in_room_elements = self.driver.find_elements(
                By.CSS_SELECTOR,
                "#imvu-canvas, .room-view, .chat-view, [data-testid='chat-input'], canvas"
            )
            if in_room_elements and any(e.is_displayed() for e in in_room_elements):
                self.log(f"Avatar ja posicionado dentro da sala 3D ({current_url}).", "OK")
            else:
                snippet = (self.driver.page_source or "")[:400].replace("\n", " ").strip()
                self.log(f"Nenhum botao JOIN localizado na sala. URL atual: '{current_url}', Titulo: '{page_title}'", "ERRO")
                self.log(f"Trecho do DOM (page_source): {snippet}", "DEBUG")
                raise RuntimeError(
                    f"Falha ao entrar na sala: Botao JOIN nao encontrado na pagina '{current_url}'."
                )

        self.log("Automacao concluida com exito! A sala 3D do IMVU esta aberta.", "OK")
        self.log("O Google Chrome permanecera ativo (detach=True) para interacao normal.", "INFO")
        return True

    def run_full_pipeline(self) -> bool:
        """Executa o fluxo completo fim-a-fim. Retorna True em sucesso e False em erro."""
        try:
            self.start_driver()
            self.perform_login()
            self.join_room()
            return True
        except Exception as e:
            self.log(f"Erro durante a automacao: {str(e)}", "ERRO")
            return False

    def close(self):
        """Fecha o navegador sob demanda."""
        if self.driver:
            self.log("Fechando navegador Google Chrome...", "INFO")
            try:
                self.driver.quit()
                self.log("Navegador fechado.", "OK")
            except Exception as e:
                self.log(f"Erro ao fechar navegador: {e}", "AVISO")
            finally:
                self.driver = None
                self._is_running = False
`
  },
  {
    name: "bot.py",
    path: "bot.py",
    language: "python",
    description: "Script de Linha de Comando (CLI) para automacao compativel com cp1252 e UTF-8",
    content: `#!/usr/bin/env python3
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

    try:
        import yaml
        with open(path, "r", encoding="utf-8") as f:
            return yaml.safe_load(f) or {}
    except ImportError:
        pass
    except Exception as e:
        print(f"[AVISO] Falha ao carregar {path} via yaml: {e}")

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
        print("\\n[ERRO] Usuario e Senha sao obrigatorios!")
        print("Defina-os no 'config.yml', variaveis de ambiente ou passe via --username e --password.")
        sys.exit(1)

    if not room_url:
        print("\\n[ERRO] Nenhuma URL de sala especificada!")
        print("Passe o parametro: python bot.py --room https://www.imvu.com/next/chat/room-XXXXX")
        sys.exit(1)

    try:
        from imvu_automator import IMVUAutomator
    except ImportError as e:
        print(f"\\n[ERRO] Dependencia ausente ao importar imvu_automator: {e}")
        print("Por favor, execute: pip install -r requirements.txt\\n")
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
            print("\\n[OK] Automacao finalizada com sucesso!")
            if keep_browser_open and not headless:
                print("[INFO] O Google Chrome esta ativo e conectado. Pressione Ctrl+C para finalizar este script.")
                try:
                    import time
                    while True:
                        time.sleep(1)
                except KeyboardInterrupt:
                    print("\\n[INFO] Encerrando processo CLI.")
            sys.exit(0)
        else:
            print("\\n[ERRO] Falha durante a execucao da automacao.")
            sys.exit(1)
    except Exception as e:
        print(f"\\n[ERRO] Excecao nao tratada: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
`
  },
  {
    name: "config.yml",
    path: "config.yml",
    language: "yaml",
    description: "Arquivo de configuracao de credenciais, timeouts e parametros do navegador",
    content: `# ==============================================================
# CONFIGURACAO DE ACESSO AO IMVU
# ==============================================================
imvu:
  username: "SEU_USUARIO_OU_EMAIL"
  password: "SUA_SENHA_AQUI"
  default_room_url: "https://www.imvu.com/next/chat/room-12345-67890"

automation:
  timeout: 25
  keep_browser_open: true
  headless: false
  user_agent: ""
  post_join_delay: 3
`
  },
  {
    name: "requirements.txt",
    path: "requirements.txt",
    language: "text",
    description: "Lista de dependencias necessarias para instalar via pip",
    content: `selenium>=4.20.0
webdriver-manager>=4.0.1
pyyaml>=6.0.1
customtkinter>=5.2.2
packaging>=23.2
`
  },
  {
    name: "run.bat",
    path: "run.bat",
    language: "batch",
    description: "Executavel de inicializacao rapida em 1 clique para Windows",
    content: `@echo off
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
`
  },
  {
    name: "run.sh",
    path: "run.sh",
    language: "bash",
    description: "Script shell de inicializacao rapida para Linux e macOS",
    content: `#!/usr/bin/env bash
set -e

echo "========================================================"
echo "       IMVU BROWSER AUTOMATION SUITE"
echo "========================================================"

if ! command -v python3 &> /dev/null; then
    echo "[ERRO] Python 3 nao encontrado!"
    exit 1
fi

echo "Instalando / verificando dependencias em requirements.txt..."
python3 -m pip install -r requirements.txt

echo ""
echo "Iniciando interface grafica (app.py)..."
python3 app.py
`
  },
  {
    name: "README.md",
    path: "README.md",
    language: "markdown",
    description: "Documentacao completa com manual de instalacao, uso e resolucao de problemas",
    content: `# IMVU Browser Automation Suite (Python + Selenium)

Automacao 100% focada na operacao fim-a-fim do IMVU Next no Google Chrome:
1. Abertura automatica do navegador Google Chrome (Selenium Manager / webdriver-manager).
2. Login automatizado no IMVU com leitura segura de credenciais via config.yml ou variaveis de ambiente.
3. Tratamento de banners de cookies e termos da interface (GDPR / OneTrust).
4. Redirecionamento instantaneo para a sala 3D especificada.
5. Clique automatico no botao JOIN / Entrar dentro da sala do IMVU Next.
6. Sessao mantida ativa e aberta (detach=True) para interacao normal sem fechar o Chrome.

## Instalacao Rapida

\`\`\`bash
pip install -r requirements.txt
\`\`\`

## Executar Interface Grafica
\`\`\`bash
python app.py
\`\`\`

## Executar Linha de Comando (CLI)
\`\`\`bash
python bot.py --room https://www.imvu.com/next/chat/room-12345-67890
\`\`\`
`
  }
];
