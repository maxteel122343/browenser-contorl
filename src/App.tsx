/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
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
  AlertTriangle,
  Info,
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
  const [roomUrl, setRoomUrl] = useState('https://www.imvu.com/next/chat/room-359407231-94/');
  const [username, setUsername] = useState('seu_avatar_imvu');
  const [password, setPassword] = useState('sua_senha_secreta');
  const [showPassword, setShowPassword] = useState(false);
  const [timeoutSec, setTimeoutSec] = useState(25);
  const [headless, setHeadless] = useState(false);
  const [keepOpen, setKeepOpen] = useState(true);

  // Execution State (Real Backend Process)
  const [isRunningReal, setIsRunningReal] = useState(false);
  const [realLogs, setRealLogs] = useState<Array<{ id: number; time: string; level: 'INFO' | 'OK' | 'AVISO' | 'ERRO' | 'DEBUG'; text: string }>>([
    { id: 1, time: '12:00:00', level: 'INFO', text: 'Sistema de automacao IMVU carregado.' },
    { id: 2, time: '12:00:01', level: 'INFO', text: 'Clique em [INICIAR AUTOMACAO REAL] para abrir o Google Chrome.' }
  ]);
  const sseRef = useRef<EventSource | null>(null);

  // Simulation State (Secondary Tab)
  const [isSimulating, setIsSimulating] = useState(false);
  const [simLogs, setSimLogs] = useState<Array<{ id: number; time: string; level: 'INFO' | 'OK' | 'AVISO' | 'ERRO' | 'DEBUG'; text: string }>>([
    { id: 1, time: '12:00:00', level: 'INFO', text: 'Simulador teorico do DOM pronto.' }
  ]);

  const selectedFile: ProjectFile = PROJECT_FILES[selectedFileIndex] || PROJECT_FILES[0];

  // Conectar ao stream de logs do servidor backend
  useEffect(() => {
    const sse = new EventSource('/api/stream-logs');
    sseRef.current = sse;

    sse.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        const rawText = String(payload.text || '').trim();
        if (!rawText) return;

        let level: 'INFO' | 'OK' | 'AVISO' | 'ERRO' | 'DEBUG' = 'INFO';
        if (rawText.includes('[OK]') || rawText.includes('[SUCCESS]')) {
          level = 'OK';
        } else if (rawText.includes('[ERRO]') || rawText.includes('[ERROR]')) {
          level = 'ERRO';
        } else if (rawText.includes('[AVISO]') || rawText.includes('[WARNING]')) {
          level = 'AVISO';
        } else if (rawText.includes('[DEBUG]')) {
          level = 'DEBUG';
        }

        if (rawText.includes('finalizado com codigo')) {
          setIsRunningReal(false);
        }

        setRealLogs((prev) => [
          ...prev,
          {
            id: Date.now() + Math.random(),
            time: payload.time || new Date().toLocaleTimeString('pt-BR'),
            level,
            text: rawText
          }
        ]);
      } catch (e) {
        // Formato raw fallback
        setRealLogs((prev) => [
          ...prev,
          {
            id: Date.now(),
            time: new Date().toLocaleTimeString('pt-BR'),
            level: 'INFO',
            text: event.data
          }
        ]);
      }
    };

    sse.onerror = () => {
      // Ignorar reconexoes silenciosamente
    };

    return () => {
      sse.close();
    };
  }, []);

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

    PROJECT_FILES.forEach((f) => {
      if (f.name === 'config.yml') {
        const customizedConfig = `# ==============================================================
# CONFIGURACAO DE ACESSO AO IMVU
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

  // Disparo da automacao REAL no backend
  const handleStartRealAutomation = async () => {
    if (isRunningReal) return;
    setIsRunningReal(true);

    const now = new Date().toLocaleTimeString('pt-BR');
    setRealLogs((prev) => [
      ...prev,
      { id: Date.now(), time: now, level: 'INFO', text: '[INICIANDO] Enviando requisicao para disparar Google Chrome real...' }
    ]);

    try {
      const res = await fetch('/api/run-automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomUrl,
          username,
          password,
          headless,
          timeout: timeoutSec,
          keepBrowserOpen: keepOpen,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setRealLogs((prev) => [
          ...prev,
          { id: Date.now(), time: now, level: 'ERRO', text: `[ERRO] Falha no backend: ${data.error || 'Erro desconhecido'}` }
        ]);
        setIsRunningReal(false);
      } else {
        setRealLogs((prev) => [
          ...prev,
          { id: Date.now(), time: now, level: 'OK', text: `[OK] Processo Python disparado com sucesso (PID: ${data.pid || 'ativo'}).` }
        ]);
      }
    } catch (err: any) {
      setRealLogs((prev) => [
        ...prev,
        { id: Date.now(), time: now, level: 'ERRO', text: `[ERRO] Falha de conexao com o backend local: ${err.message}` }
      ]);
      setIsRunningReal(false);
    }
  };

  // Parada do processo real
  const handleStopRealAutomation = async () => {
    try {
      await fetch('/api/stop-automation', { method: 'POST' });
      setIsRunningReal(false);
    } catch (err: any) {
      console.error(err);
    }
  };

  // Simulacao teorica (apenas na aba de Simulador)
  const runTheorySimulation = () => {
    if (isSimulating) return;
    setIsSimulating(true);
    setSimLogs([]);

    const steps = [
      { delay: 300, level: 'INFO' as const, msg: 'Inicializando motor do Google Chrome...' },
      { delay: 800, level: 'OK' as const, msg: 'Chrome aberto com flags anti-deteccao e detach=True.' },
      { delay: 1500, level: 'INFO' as const, msg: 'Acessando https://secure.imvu.com/welcome/login/...' },
      { delay: 2200, level: 'DEBUG' as const, msg: 'Banners OneTrust/GDPR dispensados.' },
      { delay: 3000, level: 'INFO' as const, msg: `WebDriverWait: Preenchendo credenciais para "${username}"...` },
      { delay: 3800, level: 'OK' as const, msg: 'Login validado pelo servidor IMVU.' },
      { delay: 4600, level: 'INFO' as const, msg: `Navegando para a sala: ${roomUrl}` },
      { delay: 5500, level: 'OK' as const, msg: 'Botao JOIN / Entrar localizado e acionado.' },
      { delay: 6200, level: 'OK' as const, msg: 'Sessao ativa mantida aberta no Chrome.' }
    ];

    steps.forEach(({ delay, level, msg }, idx) => {
      setTimeout(() => {
        const now = new Date().toLocaleTimeString('pt-BR');
        setSimLogs((prev) => [...prev, { id: Date.now() + idx, time: now, level, text: msg }]);
        if (idx === steps.length - 1) {
          setIsSimulating(false);
        }
      }, delay);
    });
  };

  const generatedCliCommand = `python bot.py --room "${roomUrl}"${headless ? ' --headless' : ''}`;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-blue-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 ring-1 ring-white/20">
              <Cpu className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="font-bold text-lg text-white tracking-tight">IMVU Automation Suite</h1>
                <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Selenium Real + Chrome Detach
                </span>
              </div>
              <p className="text-xs text-slate-400">Automacao fim-a-fim: Login, Redirecionamento e Entrada Instantanea na Sala 3D</p>
            </div>
          </div>

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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex space-x-1 sm:space-x-4 border-t border-slate-800/60 pt-1">
          <button
            onClick={() => setActiveTab('control')}
            className={`flex items-center space-x-2 px-3 py-2 text-xs sm:text-sm font-medium border-b-2 transition-all cursor-pointer ${
              activeTab === 'control'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Configuracao & Execucao Real</span>
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
            <span>Codigo-Fonte Completo ({PROJECT_FILES.length} arquivos)</span>
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
            <span>Simulador DOM (Teorico)</span>
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

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6">
        {/* TAB 1: CONTROL & REAL AUTOMATION */}
        {activeTab === 'control' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Form */}
            <div className="lg:col-span-7 space-y-5">
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm">
                <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                  <div className="flex items-center space-x-2">
                    <Settings className="w-5 h-5 text-indigo-400" />
                    <h2 className="font-semibold text-white">Parametros de Acesso IMVU</h2>
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
                    <input
                      type="text"
                      value={roomUrl}
                      onChange={(e) => setRoomUrl(e.target.value)}
                      placeholder="https://www.imvu.com/next/chat/room-XXXXX-XXXX"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      O bot realizara o login e abrira diretamente este endereco no Chrome.
                    </p>
                  </div>

                  {/* Credentials */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                        Usuario / Avatar Name / E-mail:
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

                  {/* Switches */}
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
                        Modo Headless (Sem janela visivel)
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
                        Manter Chrome Aberto (detach=True)
                      </label>
                    </div>
                  </div>

                  {/* REAL Automation Action Buttons */}
                  <div className="pt-3 flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={handleStartRealAutomation}
                      disabled={isRunningReal}
                      className="flex-1 flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-900/50 text-white font-semibold py-3.5 px-4 rounded-xl shadow-lg shadow-blue-600/20 transition-all cursor-pointer text-sm"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>{isRunningReal ? 'Executando no Chrome...' : 'INICIAR AUTOMACAO REAL (GOOGLE CHROME)'}</span>
                    </button>

                    <button
                      onClick={handleStopRealAutomation}
                      disabled={!isRunningReal}
                      className="flex items-center justify-center space-x-2 bg-rose-600 hover:bg-rose-500 disabled:bg-rose-950/40 text-white font-semibold py-3.5 px-5 rounded-xl transition-all cursor-pointer text-sm"
                    >
                      <Square className="w-4 h-4 fill-current" />
                      <span>PARAR / FECHAR</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* CLI Command Box */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Comando CLI para Terminal (Windows / Linux / Mac):
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

            {/* Right Live Real Terminal */}
            <div className="lg:col-span-5 space-y-5">
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 flex flex-col h-[520px]">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center space-x-2">
                    <Terminal className="w-4 h-4 text-emerald-400" />
                    <h3 className="font-semibold text-sm text-white">Log do Processo Python (Real)</h3>
                  </div>
                  <span className="flex items-center space-x-1.5 text-xs text-slate-400">
                    <span className={`w-2 h-2 rounded-full ${isRunningReal ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
                    <span>{isRunningReal ? 'Processo Ativo' : 'Parado'}</span>
                  </span>
                </div>

                {/* Console logs */}
                <div className="flex-1 bg-slate-950 rounded-lg p-3 font-mono text-xs overflow-y-auto space-y-1.5 border border-slate-800/80 mt-3">
                  {realLogs.map((log) => (
                    <div key={log.id} className="leading-relaxed">
                      <span className="text-slate-500">[{log.time}]</span>{' '}
                      <span
                        className={`font-semibold ${
                          log.level === 'OK'
                            ? 'text-emerald-400'
                            : log.level === 'ERRO'
                            ? 'text-rose-400'
                            : log.level === 'AVISO'
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
                  <span>Modo: Python + Selenium Real</span>
                  <span>Env: PYTHONIOENCODING=utf-8</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CODE EXPLORER */}
        {activeTab === 'code' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
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

              <div className="bg-gradient-to-br from-indigo-950/40 to-blue-950/40 border border-indigo-900/50 rounded-xl p-4 text-center">
                <h4 className="text-xs font-bold text-white mb-1">Baixar todos os arquivos compactados</h4>
                <p className="text-[11px] text-slate-400 mb-3">
                  Inclui app.py, imvu_automator.py, bot.py, config.yml e atalhos .bat / .sh.
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

              <div className="p-4 bg-slate-950/90 font-mono text-xs text-slate-300 overflow-x-auto flex-1 max-h-[640px] leading-relaxed select-text">
                <pre>
                  <code>{selectedFile.content}</code>
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: THEORETICAL DOM SIMULATOR (SEPARATE TAB) */}
        {activeTab === 'simulator' && (
          <div className="space-y-6">
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6">
              <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-slate-800">
                <div>
                  <h2 className="text-lg font-bold text-white mb-1">Simulador Teorico de Seletores DOM (Educacional)</h2>
                  <p className="text-sm text-slate-400">
                    Esta aba serve para visualizar os seletores e a sequencia da DOM sem abrir o Chrome real.
                  </p>
                </div>
                <button
                  onClick={runTheorySimulation}
                  disabled={isSimulating}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs px-4 py-2.5 rounded-lg flex items-center space-x-2 transition-all cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Executar Simulacao Teorica</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                {[
                  { step: 1, title: '1. Inicializacao do Chrome', selector: 'Selenium Manager / Options detach=True' },
                  { step: 2, title: '2. Login & Cookie Bypass', selector: 'button#onetrust-accept-btn-handler' },
                  { step: 3, title: '3. Preenchimento de Credenciais', selector: 'input[name="avatarname"], input[name="password"]' },
                  { step: 4, title: '4. Redirecionamento da Sala', selector: 'driver.get("https://www.imvu.com/next/chat/room-...")' },
                  { step: 5, title: '5. Clique no Botao JOIN', selector: '//button[contains(translate(., "JOIN", "join"), "join")]' },
                  { step: 6, title: '6. Sessao Ativa sem Fechar', selector: 'options.add_experimental_option("detach", True)' }
                ].map((item) => (
                  <div key={item.step} className="p-4 rounded-xl border bg-slate-950/60 border-slate-800">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-sm text-white">{item.title}</span>
                      <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-300 text-xs font-bold flex items-center justify-center">
                        {item.step}
                      </span>
                    </div>
                    <div className="bg-slate-950 p-2 rounded border border-slate-800/80 font-mono text-[11px] text-cyan-400 truncate">
                      {item.selector}
                    </div>
                  </div>
                ))}
              </div>

              {/* Simulation logs console */}
              <div className="mt-6 bg-slate-950 rounded-lg p-3 font-mono text-xs overflow-y-auto space-y-1.5 border border-slate-800/80 max-h-48">
                {simLogs.map((log) => (
                  <div key={log.id} className="leading-relaxed">
                    <span className="text-slate-500">[{log.time}]</span>{' '}
                    <span
                      className={`font-semibold ${
                        log.level === 'OK'
                          ? 'text-emerald-400'
                          : log.level === 'ERRO'
                          ? 'text-rose-400'
                          : log.level === 'AVISO'
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
            </div>
          </div>
        )}

        {/* TAB 4: HOW TO RUN GUIDE */}
        {activeTab === 'guide' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6">
              <h2 className="text-lg font-bold text-white mb-2">Instrucoes Passo a Passo para Execucao Local</h2>
              <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                Siga as orientacoes abaixo para rodar a automacao diretamente no seu computador Windows, Mac ou Linux.
              </p>

              <div className="space-y-6">
                <div className="border-l-2 border-indigo-500 pl-4 py-1">
                  <h3 className="font-semibold text-white text-sm">Passo 1: Instale o Python</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Python 3.10+ instalado no seu computador. No Windows, marque a opcao <strong>"Add Python to PATH"</strong>.
                  </p>
                </div>

                <div className="border-l-2 border-indigo-500 pl-4 py-1">
                  <h3 className="font-semibold text-white text-sm">Passo 2: Baixe os Arquivos do Projeto</h3>
                  <p className="text-xs text-slate-400 mt-1 mb-2">
                    Clique em <strong>"Baixar Pacote Completo (.ZIP)"</strong> no topo e extraia os arquivos.
                  </p>
                </div>

                <div className="border-l-2 border-indigo-500 pl-4 py-1">
                  <h3 className="font-semibold text-white text-sm">Passo 3: Instale as Dependencias</h3>
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-xs text-emerald-400 flex items-center justify-between mt-2">
                    <span>pip install -r requirements.txt</span>
                    <button
                      onClick={() => handleCopy('pip install -r requirements.txt', 'pip')}
                      className="text-slate-400 hover:text-white"
                    >
                      {copiedKey === 'pip' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="border-l-2 border-indigo-500 pl-4 py-1">
                  <h3 className="font-semibold text-white text-sm">Passo 4: Inicie a Automacao</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                    <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                      <div className="text-[11px] font-semibold text-slate-400 mb-1">Via Interface Grafica (Desktop):</div>
                      <div className="font-mono text-xs text-blue-400">python app.py</div>
                      <div className="text-[10px] text-slate-500 mt-1">(Ou duplo-clique no run.bat no Windows)</div>
                    </div>
                    <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                      <div className="text-[11px] font-semibold text-slate-400 mb-1">Via Linha de Comando (CLI):</div>
                      <div className="font-mono text-xs text-blue-400">python bot.py --room https://...</div>
                      <div className="text-[10px] text-slate-500 mt-1">Compativel com Windows cp1252 sem erros de encode</div>
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
          <span>IMVU Browser Automation Suite - Selenium 4.20+ & CustomTkinter</span>
          <span>Compativel com Windows cp1252 / UTF-8 sem emojis</span>
        </div>
      </footer>
    </div>
  );
}
