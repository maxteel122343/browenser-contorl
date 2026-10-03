# 🚀 IMVU Browser Automation Suite (Python + Selenium)

Automação 100% focada na **operação fim-a-fim** do IMVU Next no Google Chrome:
1. Abertura automática do navegador Google Chrome (sem necessidade de gerenciar ChromeDriver manualmente).
2. Login automatizado no IMVU com leitura segura de credenciais via `config.yml` ou variáveis de ambiente.
3. Tratamento de banners de cookies e termos da interface (GDPR / OneTrust).
4. Redirecionamento instantâneo para a sala 3D especificada (`https://www.imvu.com/next/chat/room-XXXXX-XXXX`).
5. Clique automático no botão **"JOIN" / "Entrar"** dentro da sala do IMVU Next.
6. **Sessão mantida ativa e aberta (`detach=True`)** para você interagir e conversar livremente sem que o Chrome feche.

---

## 📁 Estrutura do Projeto

```text
├── config.yml            # Arquivo de configuração de credenciais e opções
├── app.py                # Interface gráfica desktop moderna (CustomTkinter)
├── bot.py                # Executável de linha de comando (CLI)
├── imvu_automator.py     # Motor central de automação com Selenium WebDriver
├── requirements.txt      # Dependências Python (selenium, webdriver-manager, etc.)
├── run.bat               # Atalho de inicialização para Windows
├── run.sh                # Atalho de inicialização para Linux / macOS
└── README.md             # Instruções e documentação de uso
```

---

## ⚡ Instalação Rápida

### 1. Requisitos
- **Python 3.10 ou superior** instalado.
- **Google Chrome** instalado no computador.

### 2. Instalar Dependências
Abra o prompt de comando ou terminal na pasta do projeto e execute:
```bash
pip install -r requirements.txt
```

---

## ⚙️ Configuração (`config.yml`)

Abra o arquivo `config.yml` e insira suas credenciais e sala padrão:

```yaml
imvu:
  username: "SEU_AVATAR_NAME_OU_EMAIL"
  password: "SUA_SENHA_AQUI"
  default_room_url: "https://www.imvu.com/next/chat/room-12345-67890"

automation:
  timeout: 25              # Tempo máximo de espera para elementos
  keep_browser_open: true    # Manter Chrome aberto após término
  headless: false           # Se True, executa em segundo plano invisível
  post_join_delay: 3        # Espera adicional para carregar o 3D
```

*(Obs: Você também pode editar e salvar essas configurações diretamente pela interface gráfica no botão "Salvar Config")*

---

## 🖥️ Modo Interface Gráfica (`app.py`)

Para abrir a janela do aplicativo:
```bash
python app.py
```
*(No Windows, você também pode dar duplo clique no arquivo `run.bat`)*

### Recursos da Interface:
- **Campos Editáveis**: URL da Sala, Usuário e Senha preenchidos a partir do `config.yml`.
- **Botão "INICIAR AUTOMAÇÃO & ABRIR NAVEGADOR"**: Dispara a automação em segundo plano sem travar a interface gráfica.
- **Botão "PARAR / FECHAR NAVEGADOR"**: Encerra a instância do Chrome quando você desejar fechar a sessão.
- **Terminal de Logs em Tempo Real**: Mostra passo-a-passo (`[INFO]`, `[SUCCESS]`, `[WARNING]`, `[ERROR]`).

---

## ⌨️ Modo Linha de Comando (CLI - `bot.py`)

Para uso automatizado, scripts em lote ou agendamento de tarefas:

### Exemplos:

1. **Entrar na sala especificada usando credenciais do `config.yml`:**
   ```bash
   python bot.py --room https://www.imvu.com/next/chat/room-12345-67890
   ```

2. **Passar credenciais diretamente via argumento:**
   ```bash
   python bot.py --room https://www.imvu.com/next/chat/room-XXXXX --username meu_avatar --password minha_senha
   ```

3. **Modo invisível (Headless):**
   ```bash
   python bot.py --room https://www.imvu.com/next/chat/room-XXXXX --headless
   ```

4. **Usar um arquivo de configuração alternativo:**
   ```bash
   python bot.py --config conta2.yml --room https://www.imvu.com/next/chat/room-XXXXX
   ```

---

## 🛡️ Robustez Técnica Implementada

- **`webdriver-manager`**: Faz download e sincronização automática do ChromeDriver compatível com a sua versão instalada do Chrome, sem necessidade de baixar `.exe` manualmente.
- **`WebDriverWait` & `EC`**: Substitui pausas fixas por esperas dinâmicas inteligentes (espera explícita de elementos clicáveis).
- **Tratamento de Cookies e Pop-ups**: Clica automaticamente em "Aceitar Cookies" e fecha modais de consentimento ou restrição de idade (18+).
- **Anti-detecção básica**: Remove a flag `navigator.webdriver` e switches de automação para navegação mais natural.
- **Opção `detach=True`**: Garante que o navegador permaneça aberto e responsivo para você conversar na sala 3D mesmo após a execução do script.
