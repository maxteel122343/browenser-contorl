import express from 'express';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

let activeProcess: ChildProcess | null = null;
const sseClients: Array<(line: string) => void> = [];

function broadcastLog(line: string) {
  sseClients.forEach((send) => send(line));
}

// Endpoint de Status
app.get('/api/status', (req, res) => {
  res.json({
    running: activeProcess !== null && activeProcess.exitCode === null,
    pid: activeProcess?.pid ?? null,
  });
});

// SSE endpoint para streaming de logs em tempo real
app.get('/api/stream-logs', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const listener = (line: string) => {
    res.write(`data: ${JSON.stringify({ text: line, time: new Date().toLocaleTimeString('pt-BR') })}\n\n`);
  };

  sseClients.push(listener);

  // Ping inicial
  listener('[INFO] Conexao com stream de logs estabelecida.');

  req.on('close', () => {
    const idx = sseClients.indexOf(listener);
    if (idx !== -1) {
      sseClients.splice(idx, 1);
    }
  });
});

// Endpoint para disparar a automacao real em Python
app.post('/api/run-automation', (req, res) => {
  const { roomUrl, username, password, headless, timeout, keepBrowserOpen } = req.body;

  if (activeProcess && activeProcess.exitCode === null) {
    return res.status(400).json({ error: 'Uma automacao ja esta em execucao.' });
  }

  if (!roomUrl) {
    return res.status(400).json({ error: 'URL da sala e obrigatoria.' });
  }

  // Detecta comando python (Windows costuma usar 'python', Linux/macOS 'python3' ou 'python')
  const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
  const args = ['bot.py', '--room', roomUrl];

  if (username) args.push('--username', username);
  if (password) args.push('--password', password);
  if (headless) args.push('--headless');
  if (timeout) args.push('--timeout', String(timeout));
  if (keepBrowserOpen === false) args.push('--no-detach');

  broadcastLog(`[INFO] Executando comando real: ${pythonCmd} ${args.join(' ')}`);

  try {
    activeProcess = spawn(pythonCmd, args, {
      cwd: path.resolve(__dirname),
      env: {
        ...process.env,
        PYTHONIOENCODING: 'utf-8',
        PYTHONUTF8: '1',
      },
      shell: process.platform === 'win32',
    });

    activeProcess.stdout?.on('data', (data: Buffer) => {
      const text = data.toString('utf-8');
      const lines = text.split(/\r?\n/);
      for (const line of lines) {
        if (line.trim()) {
          broadcastLog(line);
        }
      }
    });

    activeProcess.stderr?.on('data', (data: Buffer) => {
      const text = data.toString('utf-8');
      const lines = text.split(/\r?\n/);
      for (const line of lines) {
        if (line.trim()) {
          broadcastLog(`[ERRO] ${line}`);
        }
      }
    });

    activeProcess.on('close', (code: number | null) => {
      broadcastLog(`[INFO] Processo Python finalizado com codigo ${code}`);
      activeProcess = null;
    });

    activeProcess.on('error', (err: Error) => {
      broadcastLog(`[ERRO] Falha ao disparar processo Python: ${err.message}`);
      activeProcess = null;
    });

    res.json({ success: true, message: 'Automacao real iniciada no backend.', pid: activeProcess.pid });
  } catch (err: any) {
    broadcastLog(`[ERRO] Excecao ao iniciar processo: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// Endpoint para parar a automacao
app.post('/api/stop-automation', (req, res) => {
  if (activeProcess && activeProcess.exitCode === null) {
    try {
      activeProcess.kill('SIGTERM');
      broadcastLog('[AVISO] Sinal de encerramento enviado para o processo Python.');
      res.json({ success: true, message: 'Processo encerrado.' });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  } else {
    res.json({ success: true, message: 'Nenhum processo ativo no momento.' });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[OK] Servidor IMVU Automation Suite rodando na porta ${PORT}`);
  });
}

startServer();
