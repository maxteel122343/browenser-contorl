"""
==============================================================
MOTOR DE AUTOMAÇÃO IMVU COM SELENIUM WEBDRIVER
==============================================================
Módulo responsável por:
1. Inicializar o Google Chrome via webdriver-manager de forma resiliente.
2. Navegar para a página de login do IMVU.
3. Preencher credenciais e submeter o formulário de login.
4. Tratar banners de cookies e termos da interface.
5. Redirecionar para a sala 3D do IMVU Next (chat/room-...).
6. Clicar automaticamente no botão 'JOIN' / 'Entrar'.
7. Manter a sessão aberta e interativa com a opção 'detach'.
==============================================================
"""

import time
import os
import sys
import logging
from typing import Callable, Optional

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

# Gerenciador automático de ChromeDriver
try:
    from webdriver_manager.chrome import ChromeDriverManager
except ImportError:
    ChromeDriverManager = None


class IMVUAutomator:
    """Controlador de automação do IMVU usando Selenium WebDriver."""

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
        """Envia mensagem para o callback de log (GUI ou CLI) e terminal."""
        timestamp = time.strftime("%H:%M:%S")
        formatted = f"[{timestamp}] [{level}] {message}"
        print(formatted)
        if self.log_callback:
            try:
                self.log_callback(message, level)
            except Exception as e:
                print(f"Erro no log_callback: {e}")

    def build_chrome_options(self) -> Options:
        """Configura as opções do Chrome para estabilidade e evasão de bloqueios."""
        options = Options()

        # Manter o navegador aberto mesmo após o script encerrar
        if self.keep_browser_open:
            options.add_experimental_option("detach", True)

        # Configurações de exibição
        if self.headless:
            options.add_argument("--headless=new")
            self.log("Modo Headless (sem janela visível) ativado.", "DEBUG")
        else:
            options.add_argument("--start-maximized")

        # Argumentos de estabilidade
        options.add_argument("--disable-infobars")
        options.add_argument("--disable-extensions")
        options.add_argument("--disable-gpu")
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--ignore-certificate-errors")

        # Evitar detecção automatizada básica do Chrome
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

        # Habilitar áudio/WebGL para o motor 3D do IMVU Next
        options.add_argument("--autoplay-policy=no-user-gesture-required")

        return options

    def start_driver(self) -> webdriver.Chrome:
        """Inicializa a instância do Chrome com webdriver-manager."""
        self.log("Preparando WebDriver do Google Chrome...", "INFO")
        options = self.build_chrome_options()

        try:
            if ChromeDriverManager:
                service = Service(ChromeDriverManager().install())
                driver = webdriver.Chrome(service=service, options=options)
            else:
                # Fallback se webdriver-manager não estiver disponível
                driver = webdriver.Chrome(options=options)
        except Exception as e:
            self.log(f"Falha ao iniciar via ChromeDriverManager: {e}", "WARNING")
            self.log("Tentando inicialização direta com chromedriver padrão do sistema...", "INFO")
            driver = webdriver.Chrome(options=options)

        # Ocultar flag navigator.webdriver via script injetado
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
        self.log("Google Chrome aberto com sucesso!", "SUCCESS")
        return driver

    def dismiss_cookie_banner(self):
        """Tenta fechar ou aceitar banners de cookies (OneTrust / GDPR)."""
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
        """Navega para a página de login e efetua o login no IMVU."""
        if not self.driver:
            raise RuntimeError("Driver não inicializado.")

        self.log(f"Navegando para a página de login: {self.LOGIN_URL}", "INFO")
        self.driver.get(self.LOGIN_URL)

        wait = WebDriverWait(self.driver, self.timeout)

        # Aguardar carregamento da página e dispensar cookies
        time.sleep(2)
        self.dismiss_cookie_banner()

        self.log("Aguardando campos de credenciais...", "INFO")

        # Seletores resilientes para o campo de Usuário/Email
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

        # Seletores resilientes para o campo de Senha
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
            raise NoSuchElementException("Não foi possível localizar o campo de Usuário/Avatar do IMVU.")

        pass_elem = None
        for by, sel in pass_selectors:
            try:
                pass_elem = wait.until(EC.element_to_be_clickable((by, sel)))
                if pass_elem:
                    break
            except TimeoutException:
                continue

        if not pass_elem:
            raise NoSuchElementException("Não foi possível localizar o campo de Senha do IMVU.")

        self.log(f"Preenchendo usuário: '{self.username}'...", "INFO")
        user_elem.clear()
        user_elem.send_keys(self.username)
        time.sleep(0.3)

        self.log("Preenchendo senha...", "INFO")
        pass_elem.clear()
        pass_elem.send_keys(self.password)
        time.sleep(0.3)

        # Seletores resilientes para o botão de Login
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
                    self.log("Clicando no botão de Login...", "INFO")
                    try:
                        submit_elem.click()
                    except ElementClickInterceptedException:
                        self.driver.execute_script("arguments[0].click();", submit_elem)
                    submitted = True
                    break
            except Exception:
                continue

        if not submitted:
            self.log("Submetendo formulário via tecla ENTER no campo de senha...", "INFO")
            pass_elem.send_keys(Keys.ENTER)

        self.log("Aguardando confirmação de login...", "INFO")

        # Aguardar mudança de URL ou elemento pós-login
        try:
            WebDriverWait(self.driver, 15).until(
                lambda d: (
                    "login" not in d.current_url.lower()
                    or "next" in d.current_url.lower()
                    or len(d.find_elements(By.CSS_SELECTOR, ".user-avatar, .profile-badge, [data-testid='user-avatar']")) > 0
                )
            )
            self.log(f"Login validado! URL atual: {self.driver.current_url}", "SUCCESS")
            return True
        except TimeoutException:
            # Verificar se ocorreu mensagem de erro visível
            error_elems = self.driver.find_elements(
                By.XPATH,
                "//*[contains(@class, 'error') or contains(@class, 'alert') or contains(text(), 'Incorrect') or contains(text(), 'Invalid')]"
            )
            for err in error_elems:
                if err.is_displayed() and err.text:
                    self.log(f"Alerta na página de login: {err.text.strip()}", "WARNING")

            self.log("Aviso: URL ainda contém 'login'. Prosseguindo para a sala de chat especificada...", "WARNING")
            return True

    def join_room(self) -> bool:
        """Navega para a sala especificada e clica no botão JOIN."""
        if not self.driver:
            raise RuntimeError("Driver não inicializado.")

        if not self.room_url:
            self.log("Nenhuma URL de sala especificada. Mantendo navegador na página inicial.", "WARNING")
            return True

        self.log(f"Redirecionando para a sala do IMVU: {self.room_url}", "INFO")
        self.driver.get(self.room_url)

        wait = WebDriverWait(self.driver, self.timeout)

        # Dispensar eventuais modais ou cookies no Next
        time.sleep(3)
        self.dismiss_cookie_banner()

        self.log("Aguardando carregamento da interface 3D / card da sala...", "INFO")

        # Seletores de botões JOIN / ENTRAR no IMVU Next
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
                            self.log(f"Botão 'JOIN' localizado: '{elem.text.strip() or 'Join'}'. Clicando...", "INFO")
                            try:
                                self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", elem)
                                time.sleep(0.3)
                                elem.click()
                            except Exception:
                                self.driver.execute_script("arguments[0].click();", elem)

                            join_clicked = True
                            self.log("Botão JOIN clicado com sucesso!", "SUCCESS")
                            break
                    if join_clicked:
                        break
                except Exception:
                    continue

            if join_clicked:
                break
            time.sleep(1)

        if not join_clicked:
            # Caso o usuário já tenha sido colocado diretamente dentro da sala sem tela intermediária
            current_url = self.driver.current_url
            self.log(f"Botão JOIN não foi necessário ou sala já carregou diretamente ({current_url}).", "INFO")

        # Verificar se apareceu modal de restrição de idade (18+ / Confirm)
        try:
            confirm_btns = self.driver.find_elements(
                By.XPATH,
                "//button[contains(., 'Confirm') or contains(., 'Confirmar') or contains(., 'Continuar') or contains(., 'Yes, enter')]"
            )
            for btn in confirm_btns:
                if btn.is_displayed():
                    self.log("Modal de confirmação detectado. Confirmando entrada...", "INFO")
                    self.driver.execute_script("arguments[0].click();", btn)
                    time.sleep(1)
                    break
        except Exception:
            pass

        self.log("Automação concluída com êxito! A sala 3D do IMVU está aberta.", "SUCCESS")
        self.log("O navegador Google Chrome permanecerá ativo para você interagir normalmente.", "INFO")
        return True

    def run_full_pipeline(self) -> bool:
        """Executa o fluxo completo fim-a-fim."""
        try:
            self.start_driver()
            self.perform_login()
            self.join_room()
            return True
        except Exception as e:
            self.log(f"Erro durante a automação: {str(e)}", "ERROR")
            return False

    def close(self):
        """Fecha o navegador e finaliza a sessão se requisitado pelo usuário."""
        if self.driver:
            self.log("Fechando navegador Google Chrome...", "INFO")
            try:
                self.driver.quit()
                self.log("Navegador fechado.", "SUCCESS")
            except Exception as e:
                self.log(f"Erro ao fechar navegador: {e}", "WARNING")
            finally:
                self.driver = None
                self._is_running = False
