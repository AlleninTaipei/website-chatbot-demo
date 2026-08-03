(function () {
  const isEn = document.documentElement.lang === 'en';

  const i18n = isEn
    ? {
        title: 'ASRock AI Assistant',
        subtitle: 'Ask about our services',
        greeting: "Hi! I'm the ASRock AI Center assistant. Ask me about our consulting services, deployment models, or use cases.",
        placeholder: 'Type your message...',
        send: 'Send',
        pending: 'Typing...',
        error: 'Something went wrong. Please try again, or email ASRock_AI_Center@asrock.com.tw.',
        launcherLabel: 'Open chat assistant',
      }
    : {
        title: 'ASRock AI 顧問助理',
        subtitle: '詢問我們的 AI 服務',
        greeting: '您好, 我是 ASRock AI Center 顧問助理. 歡迎詢問我們的顧問服務, 部署模式或應用案例.',
        placeholder: '請輸入訊息...',
        send: '傳送',
        pending: '輸入中...',
        error: '目前發生問題, 請稍後再試, 或直接聯絡 ASRock_AI_Center@asrock.com.tw.',
        launcherLabel: '開啟 chatbot 對話視窗',
      };

  const SESSION_KEY = 'asrock-ai-chat-session-id';
  function getSessionId() {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  }

  function buildWidget() {
    const root = document.createElement('div');
    root.className = 'chatbot';
    root.innerHTML = `
      <div class="chatbot-panel" role="dialog" aria-label="${i18n.title}">
        <div class="chatbot-header">
          <div class="chatbot-header-mark">AI</div>
          <div class="chatbot-header-text">
            <strong>${i18n.title}</strong>
            <span>${i18n.subtitle}</span>
          </div>
        </div>
        <div class="chatbot-messages" id="chatbot-messages"></div>
        <form class="chatbot-form" id="chatbot-form">
          <textarea class="chatbot-input" id="chatbot-input" rows="1" placeholder="${i18n.placeholder}"></textarea>
          <button type="submit" class="chatbot-send" id="chatbot-send">${i18n.send}</button>
        </form>
      </div>
      <button type="button" class="chatbot-launcher" aria-label="${i18n.launcherLabel}">
        <svg class="icon-chat" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
        <svg class="icon-close" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
    `;
    document.body.appendChild(root);
    return root;
  }

  function appendMessage(container, role, text) {
    const el = document.createElement('div');
    el.className = `chatbot-msg is-${role}`;
    el.textContent = text;
    container.appendChild(el);
    container.scrollTop = container.scrollHeight;
    return el;
  }

  function init() {
    const root = buildWidget();
    const launcher = root.querySelector('.chatbot-launcher');
    const messages = root.querySelector('#chatbot-messages');
    const form = root.querySelector('#chatbot-form');
    const input = root.querySelector('#chatbot-input');
    const sendBtn = root.querySelector('#chatbot-send');
    const sessionId = getSessionId();

    let greeted = false;
    launcher.addEventListener('click', () => {
      root.classList.toggle('is-open');
      if (root.classList.contains('is-open')) {
        if (!greeted) {
          appendMessage(messages, 'bot', i18n.greeting);
          greeted = true;
        }
        input.focus();
      }
    });

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const message = input.value.trim();
      if (!message) return;

      appendMessage(messages, 'user', message);
      input.value = '';
      input.style.height = 'auto';
      input.disabled = true;
      sendBtn.disabled = true;
      const pending = appendMessage(messages, 'pending', i18n.pending);

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, message }),
        });
        const data = await res.json();
        pending.remove();
        if (!res.ok) {
          appendMessage(messages, 'error', data.error || i18n.error);
        } else {
          appendMessage(messages, 'bot', data.reply);
        }
      } catch (err) {
        pending.remove();
        appendMessage(messages, 'error', i18n.error);
      } finally {
        input.disabled = false;
        sendBtn.disabled = false;
        input.focus();
      }
    });

    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        form.requestSubmit();
      }
    });

    input.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = `${Math.min(input.scrollHeight, 96)}px`;
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
