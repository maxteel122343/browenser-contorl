/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import JSZip from 'jszip';
import {
  Terminal,
  Play,
  Square,
  Download,
  Copy,
  Check,
  Code2,
  Settings,
  Layers,
  FileText,
  ShieldCheck,
  ExternalLink,
  Cpu,
  Monitor,
  CheckCircle2,
  AlertTriangle,
  Info,
  Sparkles,
  ArrowRight,
  Eye,
  EyeOff,
  FolderArchive
} from 'lucide-react';
import { PROJECT_FILES, ProjectFile } from './data/projectFiles';

export default function App() {
  const [activeTab, setActiveTab] = useState<'control' | 'simulator' | 'code' | 'guide'>('control');
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Form State
  const [roomUrl, setRoomUrl] = useState('https://www.imvu.com/next/chat/room-12345-67890');
  const [username, setUsername] = useState('seu_avatar_imvu');
  const [password, setPassword] = useState('sua_senha_secreta');
  const [showPassword, setShowPassword] = useState(false);
  const [timeoutSec, setTimeoutSec] = useState(25);
  const [headless, setHeadless] = useState(false);
  const [keepOpen, setKeepOpen] = useState(true);

  // Simulation State
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationLogs, setSimulationLogs] = useState<Array<{ id: number; time: string; level: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' | 'DEBUG'; text: string }>>([
    { id: 1, time: '12:00:00', level: 'INFO', text: 'Sistema de automação IMVU inicializado.' },
    { id: 2, time: '12:00:01', level: 'INFO', text: 'Aguardando comando do usuário para iniciar Chrome...' }
  ]);
  const [simulationProgress, setSimulationProgress] = useState(0);
  const [activeStep, setActiveStep] = useState(0);

  const selectedFile: ProjectFile = PROJECT_FILES[selectedFileIndex] || PROJECT_FILES[0];

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleDownloadSingleFile = (file: ProjectFile) => {
    const blob = new Blob([file.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadFullZip = async () => {
    const zip = new JSZip();

    // Populate all project files into the zip
    PROJECT_FILES.forEach((f) => {
      // If config.yml, inject the currently edited form values!
      if (f.name === 'config.yml') {
        const customizedConfig = `# ==============================================================
# CONFIGURAÇÃO DE ACESSO AO IMVU
# ==============================================================
imvu:
  username: "${username.replace(/"/g, '\\"')}"
  password: "${password.replace(/"/g, '\\"')}"
  default_room_url: "${roomUrl.replace(/"/g, '\\"')}"

automation:
  timeout: ${timeoutSec}
  keep_browser_open: ${keepOpen}
  headless: ${headless}
  user_agent: ""
  post_join_delay: 3
`;
        zip.file(f.name, customizedConfig);
      } else {
        zip.file(f.name, f.content);
      }
    });

    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'imvu_automation_bot.zip';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const startSimulation = () => {
    if (isSimulating) return;
    setIsSimulating(true);
    setSimulationLogs([]);
    setSimulationProgress(5);
    setActiveStep(1);

    const steps = [
      { delay: 400, step: 1, level: 'INFO' as const, msg: 'Iniciando WebDriver do Google Chrome via webdriver-manager...' },
      { delay: 1000, step: 1, level: 'SUCCESS' as const, msg: 'Google Chrome aberto com sucesso (detach=True, disable-blink-features ativado).' },
      { delay: 1800, step: 2, level: 'INFO' as const, msg: 'Navegando para https://secure.imvu.com/welcome/login/...' },
      { delay: 2600, step: 2, level: 'DEBUG' as const, msg: 'Banner OneTrust/GDPR localizado e dispensado automaticamente.' },
      { delay: 3300, step: 3, level: 'INFO' as const, msg: `WebDriverWait: Preenchendo credenciais para usuário "${username}"...` },
      { delay: 4000, step: 3, level: 'INFO' as const, msg: 'Clicando no botão de login (#loginsubmit)...' },
      { delay: 4900, step: 3, level: 'SUCCESS' as const, msg: 'Autenticação validada! Redirecionamento autorizado.' },
      { delay: 5800, step: 4, level: 'INFO' as const, msg: `Navegando diretamente para a sala: ${roomUrl}` },
      { delay: 6800, step: 5, level: 'INFO' as const, msg: 'Aguardando elementos da DOM do IMVU Next (WebGL Canvas e botões da sala)...' },
      { delay: 7800, step: 5, level: 'SUCCESS' as const, msg: 'Botão "JOIN / ENTRAR" localizado. Executando clique via JavaScript executor...' },
      { delay: 8800, step: 6, level: 'SUCCESS' as const, msg: '🎉 Avatar inserido na sala 3D! Conexão estabelecida com sucesso.' },
      { delay: 9400, step: 6, level: 'INFO' as const, msg: '📌 O Google Chrome permanecerá aberto para você conversar livremente.' }
    ];

    steps.forEach(({ delay, step, level, msg }, idx) => {
      setTimeout(() => {
        const now = new Date().toLocaleTimeString('pt-BR');
        setSimulationLogs((prev) => [...prev, { id: Date.now() + idx, time: now, level, text: msg }]);
        setActiveStep(step);
        setSimulationProgress(Math.min(100, Math.round(((idx + 1) / steps.length) * 100)));

        if (idx === steps.length - 1) {
          setIsSimulating(false);
        }
      }, delay);
    });
  };

  const stopSimulation = () => {
    setIsSimulating(false);
    const now = new Date().toLocaleTimeString('pt-BR');
    setSimulationLogs((prev) => [
      ...prev,
      { id: Date.now(), time: now, level: 'WARNING', text: 'Comando recebido: Navegador Chrome encerrado pelo usuário.' }
    ]);
  };

  const generatedCliCommand = `python bot.py --room "${roomUrl}"${headless ? ' --headless' : ''}`;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Banner Navigation */}
      <header className="border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-blue-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 ring-1 ring-white/20">
              <Cpu className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="font-bold text-lg text-white tracking-tight">IMVU Automation Suite</h1>
                <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Python + Selenium
                </span>
              </div>
              <p className="text-xs text-slate-400">Automação completa: Login, Redirecionamento e Entrada Instantânea na Sala 3D</p>
            </div>
          </div>

          {/* Action Header Button: Download Full ZIP */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handleDownloadFullZip}
              className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-xs sm:text-sm px-4 py-2 rounded-lg transition-all shadow-md shadow-indigo-600/25 active:scale-95 cursor-pointer border border-blue-400/30"
            >
              <FolderArchive className="w-4 h-4" />
              <span>Baixar Pacote Completo (.ZIP)</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex space-x-1 sm:space-x-4 border-t border-slate-800/50 pt-1">
          <button
            onClick={() => setActiveTab('control')}
            className={`flex items-center space-x-2 px-3 py-2 text-xs sm:text-sm font-medium border-b-2 transition-all cursor-pointer ${
              activeTab === 'control'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Configuração & Execução</span>
          </button>

          <button
            onClick={() => setActiveTab('simulator')}
            className={`flex items-center space-x-2 px-3 py-2 text-xs sm:text-sm font-medium border-b-2 transition-all cursor-pointer ${
              activeTab === 'simulator'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>Simulador de Automação DOM</span>
          </button>

          <button
            onClick={() => setActiveTab('code')}
            className={`flex items-center space-x-2 px-3 py-2 text-xs sm:text-sm font-medium border-b-2 transition-all cursor-pointer ${
              activeTab === 'code'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code2 className="w-4 h-4" />
            <span>Código-Fonte Completo ({PROJECT_FILES.length} arquivos)</span>
          </button>

          <button
            onClick={() => setActiveTab('guide')}
            className={`flex items-center space-x-2 px-3 py-2 text-xs sm:text-sm font-medium border-b-2 transition-all cursor-pointer ${
              activeTab === 'guide'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Como Rodar no seu PC</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6">
        {/* TAB 1: CONTROL & CONFIG */}
        {activeTab === 'control' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Configuration Form */}
            <div className="lg:col-span-7 space-y-5">
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm">
                <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                  <div className="flex items-center space-x-2">
                    <Settings className="w-5 h-5 text-indigo-400" />
                    <h2 className="font-semibold text-white">Parâmetros da Automação IMVU</h2>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                    config.yml
                  </span>
                </div>

                <div className="space-y-4 mt-4">
                  {/* Room URL */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      URL da Sala IMVU (Next Chat):
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={roomUrl}
                        onChange={(e) => setRoomUrl(e.target.value)}
                        placeholder="https://www.imvu.com/next/chat/room-XXXXX-XXXX"
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono"
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      O bot abrirá esta sala diretamente após a validação do login no IMVU.
                    </p>
                  </div>

                  {/* Credentials Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                        Usuário / Avatar Name / E-mail:
                      </label>
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Seu Avatar Name ou E-mail"
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                        Senha do IMVU:
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Sua Senha"
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-3.5 pr-10 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Switches and options */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div className="flex items-center space-x-3 bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                      <input
                        type="checkbox"
                        id="headless-check"
                        checked={headless}
                        onChange={(e) => setHeadless(e.target.checked)}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-700 bg-slate-900"
                      />
                      <label htmlFor="headless-check" className="text-xs text-slate-300 font-medium cursor-pointer">
                        Modo Headless (Sem janela visível)
                      </label>
                    </div>

                    <div className="flex items-center space-x-3 bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                      <input
                        type="checkbox"
                        id="keepopen-check"
                        checked={keepOpen}
                        onChange={(e) => setKeepOpen(e.target.checked)}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-700 bg-slate-900"
                      />
                      <label htmlFor="keepopen-check" className="text-xs text-slate-300 font-medium cursor-pointer">
                        Manter Chrome Aberto (`detach=True`)
                      </label>
                    </div>
                  </div>

                  {/* Big Action Buttons */}
                  <div className="pt-3 flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={startSimulation}
                      disabled={isSimulating}
                      className="flex-1 flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-900/50 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-blue-600/20 transition-all cursor-pointer text-sm"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>{isSimulating ? 'Automação em Execução...' : 'INICIAR AUTOMAÇÃO (TESTE)'}</span>
                    </button>

                    <button
                      onClick={stopSimulation}
                      disabled={!isSimulating}
                      className="flex items-center justify-center space-x-2 bg-rose-600 hover:bg-rose-500 disabled:bg-rose-950/40 text-white font-semibold py-3 px-5 rounded-xl transition-all cursor-pointer text-sm"
                    >
                      <Square className="w-4 h-4 fill-current" />
                      <span>PARAR / FECHAR</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Quick CLI Command Box */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Comando CLI Gerado (Para rodar no Terminal):
                  </span>
                  <button
                    onClick={() => handleCopy(generatedCliCommand, 'cli')}
                    className="flex items-center space-x-1 text-xs text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer"
                  >
                    {copiedKey === 'cli' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'cli' ? 'Copiado!' : 'Copiar'}</span>
                  </button>
                </div>
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-xs text-indigo-300 overflow-x-auto">
                  {generatedCliCommand}
                </div>
              </div>
            </div>

            {/* Right Column: Execution Live Terminal */}
            <div className="lg:col-span-5 space-y-5">
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 flex flex-col h-[520px]">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center space-x-2">
                    <Terminal className="w-4 h-4 text-emerald-400" />
                    <h3 className="font-semibold text-sm text-white">Log de Automação em Tempo Real</h3>
                  </div>
                  <span className="flex items-center space-x-1.5 text-xs text-slate-400">
                    <span className={`w-2 h-2 rounded-full ${isSimulating ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
                    <span>{isSimulating ? 'Executando' : 'Aguardando'}</span>
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-950 h-1.5 rounded-full my-3 overflow-hidden border border-slate-800">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-emerald-400 h-full transition-all duration-300 rounded-full"
                    style={{ width: `${simulationProgress}%` }}
                  />
                </div>

                {/* Console text log */}
                <div className="flex-1 bg-slate-950 rounded-lg p-3 font-mono text-xs overflow-y-auto space-y-1.5 border border-slate-800/80">
                  {simulationLogs.map((log) => (
                    <div key={log.id} className="leading-relaxed">
                      <span className="text-slate-500">[{log.time}]</span>{' '}
                      <span
                        className={`font-semibold ${
                          log.level === 'SUCCESS'
                            ? 'text-emerald-400'
                            : log.level === 'ERROR'
                            ? 'text-rose-400'
                            : log.level === 'WARNING'
                            ? 'text-amber-400'
                            : log.level === 'DEBUG'
                            ? 'text-purple-400'
                            : 'text-blue-400'
                        }`}
                      >
                        [{log.level}]
                      </span>{' '}
                      <span className="text-slate-200">{log.text}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-3 text-[11px] text-slate-400 flex items-center justify-between border-t border-slate-800/80 mt-2">
                  <span>Sessão: Chrome WebDriver</span>
                  <span>Modo: {keepOpen ? 'detach=True (Mantém aberto)' : 'Fecha ao finalizar'}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: DOM AUTOMATION SIMULATOR & STEP BREAKDOWN */}
        {activeTab === 'simulator' && (
          <div className="space-y-6">
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6">
              <div className="max-w-3xl">
                <h2 className="text-lg font-bold text-white mb-1">Mapeamento e Fluxo da DOM do IMVU Next</h2>
                <p className="text-sm text-slate-400">
                  O IMVU Next opera como uma Single Page Application com WebGL e Canvas 3D. A automação utiliza
                  seletores resilientes em cadeia com <code>WebDriverWait</code> e fallback de clique em JavaScript.
                </p>
              </div>

              {/* 6 Steps visual pipeline */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                {[
                  {
                    step: 1,
                    title: '1. Inicialização do Chrome',
                    desc: 'Uso do ChromeDriverManager para instalar o ChromeDriver ideal sem intervenção manual. Configuração de detach=True e remoção da flag navigator.webdriver.',
                    selector: 'Options: --disable-blink-features=AutomationControlled'
                  },
                  {
                    step: 2,
                    title: '2. Login & Cookie Bypass',
                    desc: 'Acesso a secure.imvu.com/welcome/login/ e fechamento imediato do banner OneTrust de cookies para evitar bloqueio de cliques nos campos.',
                    selector: 'button#onetrust-accept-btn-handler'
                  },
                  {
                    step: 3,
                    title: '3. Preenchimento de Credenciais',
                    desc: 'Localização dos campos avatarname/email e password usando esperas explícitas (EC.element_to_be_clickable) e submissão via botão ou tecla ENTER.',
                    selector: 'input[name="avatarname"], input[name="password"]'
                  },
                  {
                    step: 4,
                    title: '4. Redirecionamento da Sala',
                    desc: 'Após confirmação da autenticação, o driver navega diretamente para a URL da sala especificada no config.yml ou argumento CLI.',
                    selector: 'driver.get("https://www.imvu.com/next/chat/room-...")'
                  },
                  {
                    step: 5,
                    title: '5. Clique no Botão "JOIN"',
                    desc: 'Busca por botões com texto "Join", "Entrar" ou atributos de card de sala. Se houver sobreposição do canvas 3D, aciona clique forçado via JS.',
                    selector: '//button[contains(translate(., "JOIN", "join"), "join")]'
                  },
                  {
                    step: 6,
                    title: '6. Manutenção da Sessão Ativa',
                    desc: 'O processo mantém o Google Chrome ativo e livre para o usuário digitar no chat 3D, movimentar o avatar e interagir normalmente.',
                    selector: 'options.add_experimental_option("detach", True)'
                  }
                ].map((item) => (
                  <div
                    key={item.step}
                    className={`p-4 rounded-xl border transition-all ${
                      activeStep === item.step
                        ? 'bg-indigo-950/40 border-indigo-500 shadow-md shadow-indigo-500/10'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-sm text-white">{item.title}</span>
                      <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-300 text-xs font-bold flex items-center justify-center">
                        {item.step}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mb-3 leading-relaxed">{item.desc}</p>
                    <div className="bg-slate-950 p-2 rounded border border-slate-800/80 font-mono text-[11px] text-cyan-400 truncate">
                      {item.selector}
                    </div>
                  </div>
                ))}
              </div>

              {/* Action trigger button */}
              <div className="mt-6 flex items-center justify-between pt-4 border-t border-slate-800">
                <div className="text-xs text-slate-400">
                  Clique no botão para executar o teste do fluxo de automação simulado:
                </div>
                <button
                  onClick={startSimulation}
                  disabled={isSimulating}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs px-4 py-2.5 rounded-lg flex items-center space-x-2 transition-all cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Simular Pipeline Completo</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: CODE EXPLORER */}
        {activeTab === 'code' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* File List Sidebar */}
            <div className="lg:col-span-4 space-y-2">
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2 py-1 mb-2">
                  Arquivos do Projeto Python ({PROJECT_FILES.length})
                </div>
                <div className="space-y-1">
                  {PROJECT_FILES.map((file, idx) => (
                    <button
                      key={file.name}
                      onClick={() => setSelectedFileIndex(idx)}
                      className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-medium transition-all flex items-center justify-between cursor-pointer ${
                        selectedFileIndex === idx
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 truncate">
                        <FileText className="w-4 h-4 opacity-75 shrink-0" />
                        <span className="font-mono">{file.name}</span>
                      </div>
                      <span className="text-[10px] uppercase opacity-75">{file.language}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Zip Action */}
              <div className="bg-gradient-to-br from-indigo-950/40 to-blue-950/40 border border-indigo-900/50 rounded-xl p-4 text-center">
                <h4 className="text-xs font-bold text-white mb-1">Deseja todos os arquivos compactados?</h4>
                <p className="text-[11px] text-slate-400 mb-3">
                  Baixe o pacote completo com scripts, executáveis .bat/.sh e requisitos.
                </p>
                <button
                  onClick={handleDownloadFullZip}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs py-2 px-3 rounded-lg flex items-center justify-center space-x-2 transition-all cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar imvu_automation_bot.zip</span>
                </button>
              </div>
            </div>

            {/* Code Viewer Panel */}
            <div className="lg:col-span-8 bg-slate-900/80 border border-slate-800 rounded-xl flex flex-col overflow-hidden">
              <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2">
                <div>
                  <span className="font-mono text-sm font-bold text-white">{selectedFile.name}</span>
                  <p className="text-[11px] text-slate-400">{selectedFile.description}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleCopy(selectedFile.content, selectedFile.name)}
                    className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-3 py-1.5 rounded-md transition-all cursor-pointer"
                  >
                    {copiedKey === selectedFile.name ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === selectedFile.name ? 'Copiado!' : 'Copiar'}</span>
                  </button>
                  <button
                    onClick={() => handleDownloadSingleFile(selectedFile)}
                    className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-3 py-1.5 rounded-md transition-all cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Baixar</span>
                  </button>
                </div>
              </div>

              {/* Code Pre/Code view */}
              <div className="p-4 bg-slate-950/90 font-mono text-xs text-slate-300 overflow-x-auto flex-1 max-h-[640px] leading-relaxed select-text">
                <pre>
                  <code>{selectedFile.content}</code>
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: HOW TO RUN GUIDE */}
        {activeTab === 'guide' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6">
              <h2 className="text-lg font-bold text-white mb-2">Instruções Passo a Passo para Execução Local</h2>
              <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                Siga as orientações abaixo para rodar a automação no seu computador com Google Chrome instalado.
              </p>

              <div className="space-y-6">
                {/* Step 1 */}
                <div className="border-l-2 border-indigo-500 pl-4 py-1">
                  <h3 className="font-semibold text-white text-sm">Passo 1: Instale o Python</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Certifique-se de ter o Python 3.10+ instalado no seu computador. No instalador do Windows,
                    marque a caixa <strong>"Add Python to PATH"</strong>.
                  </p>
                </div>

                {/* Step 2 */}
                <div className="border-l-2 border-indigo-500 pl-4 py-1">
                  <h3 className="font-semibold text-white text-sm">Passo 2: Baixe os Arquivos do Projeto</h3>
                  <p className="text-xs text-slate-400 mt-1 mb-2">
                    Clique no botão <strong>"Baixar Pacote Completo (.ZIP)"</strong> no topo desta página e extraia
                    os arquivos em uma pasta de sua preferência.
                  </p>
                </div>

                {/* Step 3 */}
                <div className="border-l-2 border-indigo-500 pl-4 py-1">
                  <h3 className="font-semibold text-white text-sm">Passo 3: Instale as Dependências</h3>
                  <p className="text-xs text-slate-400 mt-1 mb-2">
                    Abra o prompt de comando (CMD ou PowerShell) na pasta do projeto e digite:
                  </p>
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-xs text-emerald-400 flex items-center justify-between">
                    <span>pip install -r requirements.txt</span>
                    <button
                      onClick={() => handleCopy('pip install -r requirements.txt', 'pip')}
                      className="text-slate-400 hover:text-white"
                    >
                      {copiedKey === 'pip' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="border-l-2 border-indigo-500 pl-4 py-1">
                  <h3 className="font-semibold text-white text-sm">Passo 4: Inicie a Aplicação</h3>
                  <p className="text-xs text-slate-400 mt-1 mb-2">
                    Você pode iniciar a interface gráfica ou a linha de comando:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                      <div className="text-[11px] font-semibold text-slate-400 mb-1">Para abrir a Interface Gráfica:</div>
                      <div className="font-mono text-xs text-blue-400">python app.py</div>
                      <div className="text-[10px] text-slate-500 mt-1">(Ou duplo-clique em run.bat no Windows)</div>
                    </div>
                    <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                      <div className="text-[11px] font-semibold text-slate-400 mb-1">Para rodar via Linha de Comando (CLI):</div>
                      <div className="font-mono text-xs text-blue-400">python bot.py --room https://...</div>
                      <div className="text-[10px] text-slate-500 mt-1">Ideal para scripts automáticos ou atalhos</div>
                    </div>
                  </div>
                </div>

                {/* Troubleshooting */}
                <div className="mt-8 pt-6 border-t border-slate-800">
                  <h3 className="font-semibold text-white text-sm mb-3 flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <span>Dicas & Resolução de Dúvidas Frequentes</span>
                  </h3>
                  <div className="space-y-3 text-xs text-slate-400 leading-relaxed">
                    <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800">
                      <strong className="text-slate-200">Como funciona o ChromeDriver?</strong>
                      <p className="mt-0.5">
                        O script utiliza <code>webdriver-manager</code>, que detecta a versão exata do seu Google
                        Chrome instalado e baixa automaticamente o driver correto na primeira execução. Você não
                        precisa baixar executáveis manualmente.
                      </p>
                    </div>

                    <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800">
                      <strong className="text-slate-200">Por que o navegador não fecha sozinho?</strong>
                      <p className="mt-0.5">
                        A opção <code>options.add_experimental_option("detach", True)</code> foi configurada
                        propositalmente para manter a janela do Google Chrome ativa. Assim, você entra na sala e pode
                        conversar e interagir normalmente com outros usuários. Quando quiser fechar, basta fechar o
                        Chrome ou clicar em <strong>"PARAR / FECHAR NAVEGADOR"</strong>.
                      </p>
                    </div>

                    <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800">
                      <strong className="text-slate-200">E se o IMVU solicitar 2FA ou Captcha?</strong>
                      <p className="mt-0.5">
                        O motor possui tratamento anti-detecção (<code>--disable-blink-features=AutomationControlled</code> e exclusão de flags de teste).
                        Caso o IMVU exija um captcha visual pontual em um novo IP, a janela do Chrome estará visível
                        na sua tela para você resolver o captcha uma única vez.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-4 bg-slate-950 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>IMVU Browser Automation Suite • Selenium 4.20+ & CustomTkinter</span>
          <span>Arquivos prontos para execução em Windows, macOS e Linux</span>
        </div>
      </footer>
    </div>
  );
}
