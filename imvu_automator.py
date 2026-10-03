"""
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
        # Sem emojis ou simbolos nao-ASCII
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

        # Manter o navegador aberto mesmo apos o encerramento do script Python
        if self.keep_browser_open:
            options.add_experimental_option("detach", True)

        # Configuracoes de exibicao
        if self.headless:
            options.add_argument("--headless=new")
            self.log("Modo Headless (sem janela visivel) ativado.", "DEBUG")
        else:
            options.add_argument("--start-maximized")

        # Argumentos de estabilidade
        options.add_argument("--disable-infobars")
        options.add_argument("--disable-extensions")
        options.add_argument("--disable-gpu")
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--ignore-certificate-errors")

        # Evitar deteccao automatizada basica do Chrome
        options.add_experimental_option("excludeSwitches", ["enable-automation"])
        options.add_experimental_option("useAutomationExtension", False)
        options.add_argument("--disable-blink-features=AutomationControlled")

        # User-Agent personalizado se especificado
        if self.user_agent:
            options.add_argument(f"user-agent={self.user_agent}")
        else:
            default_ua = (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
            )
            options.add_argument(f"user-agent={default_ua}")

        # Habilitar audio/WebGL para o motor 3D do IMVU Next
        options.add_argument("--autoplay-policy=no-user-gesture-required")

        return options

    def start_driver(self) -> webdriver.Chrome:
        """Inicializa a instancia do Google Chrome com fallback automatico."""
        self.log("Preparando WebDriver do Google Chrome...", "INFO")
        options = self.build_chrome_options()
        driver = None

        # 1. Tentativa via Selenium Manager nativo (Selenium 4.10+)
        try:
            driver = webdriver.Chrome(options=options)
            self.log("Chrome inicializado via Selenium Manager nativo.", "DEBUG")
        except Exception as e1:
            self.log(f"Selenium Manager nao inicializou direto ({e1}). Tentando webdriver-manager...", "DEBUG")
            # 2. Tentativa via ChromeDriverManager
            if ChromeDriverManager:
                try:
                    service = Service(ChromeDriverManager().install())
                    driver = webdriver.Chrome(service=service, options=options)
                    self.log("Chrome inicializado via ChromeDriverManager.", "DEBUG")
                except Exception as e2:
                    self.log(f"Falha ao iniciar via ChromeDriverManager: {e2}", "AVISO")

        if not driver:
            # Ultima tentativa forcada
            driver = webdriver.Chrome(options=options)

        # Ocultar flag navigator.webdriver via CDP script injetado
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

        # Aguardar carregamento da pagina e dispensar cookies
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

        # Aguardar mudanca de URL ou presenca de elemento pos-login
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
            # Checar mensagens de erro na pagina
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

        # Checar modais de confirmacao (ex: 18+ / Confirm)
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

        # Validar se o usuario esta dentro da sala ou se o DOM mudou
        current_url = self.driver.current_url
        page_title = self.driver.title or "[Sem Titulo]"

        if not join_clicked:
            # Checar se ja esta dentro do canvas 3D ou seletor de chat
            in_room_elements = self.driver.find_elements(
                By.CSS_SELECTOR,
                "#imvu-canvas, .room-view, .chat-view, [data-testid='chat-input'], canvas"
            )
            if in_room_elements and any(e.is_displayed() for e in in_room_elements):
                self.log(f"Avatar ja posicionado dentro da sala 3D ({current_url}).", "OK")
            else:
                # DOM pode ter mudado: registrar URL atual, titulo e trecho do page_source
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
