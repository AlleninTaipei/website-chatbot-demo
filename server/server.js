const path = require('path');
const express = require('express');
const { spawn } = require('child_process');
const { SYSTEM_PROMPT } = require('./knowledge');

const PORT = process.env.PORT || 3000;
const CLAUDE_BIN = process.env.CLAUDE_BIN || 'claude';
const CLAUDE_MODEL = process.env.CLAUDE_MODEL || '';
const CLAUDE_TIMEOUT_MS = 60_000;
const MAX_MESSAGE_LEN = 2000;
const MAX_HISTORY_TURNS = 8;

const app = express();
app.use(express.json({ limit: '100kb' }));
app.use(express.static(path.join(__dirname, '..')));

/** @type {Map<string, Array<{ role: 'user' | 'assistant', text: string }>>} */
const sessions = new Map();

function buildPrompt(history, message) {
  if (history.length === 0) {
    return message;
  }
  const transcript = history
    .map((turn) => `${turn.role === 'user' ? '使用者' : '助理'}: ${turn.text}`)
    .join('\n');
  return `以下是先前的對話紀錄:\n${transcript}\n\n使用者最新訊息: ${message}\n\n請直接給出助理的下一句回覆.`;
}

function askClaude(prompt) {
  return new Promise((resolve, reject) => {
    const args = ['-p', prompt, '--system-prompt', SYSTEM_PROMPT, '--tools', '', '--output-format', 'text', '--no-session-persistence'];
    if (CLAUDE_MODEL) {
      args.push('--model', CLAUDE_MODEL);
    }

    const child = spawn(CLAUDE_BIN, args, { windowsHide: true });

    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error('claude cli 回應逾時'));
    }, CLAUDE_TIMEOUT_MS);

    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });

    child.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        reject(new Error(`claude cli 結束代碼 ${code}: ${stderr.trim() || '未知錯誤'}`));
        return;
      }
      resolve(stdout.trim());
    });
  });
}

app.post('/api/chat', async (req, res) => {
  const { sessionId, message } = req.body || {};

  if (typeof sessionId !== 'string' || !sessionId) {
    return res.status(400).json({ error: 'sessionId 為必填' });
  }
  if (typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'message 為必填' });
  }
  if (message.length > MAX_MESSAGE_LEN) {
    return res.status(400).json({ error: `訊息長度不可超過 ${MAX_MESSAGE_LEN} 字` });
  }

  const history = sessions.get(sessionId) || [];
  const prompt = buildPrompt(history, message.trim());

  try {
    const reply = await askClaude(prompt);
    history.push({ role: 'user', text: message.trim() });
    history.push({ role: 'assistant', text: reply });
    while (history.length > MAX_HISTORY_TURNS * 2) {
      history.shift();
    }
    sessions.set(sessionId, history);
    res.json({ reply });
  } catch (err) {
    console.error('[chat] claude cli 呼叫失敗:', err.message);
    res.status(502).json({
      error: '目前無法取得回覆, 請稍後再試, 或直接聯絡 ASRock_AI_Center@asrock.com.tw',
    });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', claudeBin: CLAUDE_BIN });
});

app.listen(PORT, () => {
  console.log(`ASRock AI chatbot 模擬伺服器已啟動: http://localhost:${PORT}`);
});
