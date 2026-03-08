import OpenAI from 'https://esm.sh/openai@6.27.0?bundle';

const OPENAI_CONFIG = {
  baseURL: 'http://726541.proxy.nscc-gz.cn:8888/v1',
  apiKey: 'sk-VfaA0oKVvHCuQZ3FD525242719044891B6FbF9AeCaF6CdA0',
  model: 'deepseek-chat',
};
const NUDGE_STORAGE_KEY = 'yatcc-doc-agent-nudge-dismissed';
const MAX_HISTORY_TURNS = 6;
const MAX_CONTEXT_DOCS = 6;

const root = document.querySelector('[data-yat-agent]');

if (root) {
  const state = {
    history: [],
    isOpen: false,
    isBusy: false,
    searchIndex: null,
    thinkingEl: null,
  };

  const nudge = root.querySelector('[data-agent-nudge]');
  const dismissNudgeButton = root.querySelector('[data-agent-dismiss-nudge]');
  const fab = root.querySelector('.yat-agent__fab');
  const panel = root.querySelector('.yat-agent__panel');
  const closeButton = root.querySelector('[data-agent-close]');
  const messagesEl = root.querySelector('[data-agent-messages]');
  const form = root.querySelector('[data-agent-form]');
  const input = form.querySelector('textarea[name="prompt"]');
  const submitButton = form.querySelector('button[type="submit"]');
  const statusEl = root.querySelector('[data-agent-status]');

  setPanelOpen(false);
  hydrateNudge();
  attachEvents();

  function attachEvents() {
    fab.addEventListener('click', () => {
      setPanelOpen(!state.isOpen);
    });

    closeButton.addEventListener('click', () => {
      setPanelOpen(false);
    });

    dismissNudgeButton?.addEventListener('click', () => {
      dismissNudge();
    });

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const question = input.value.trim();
      if (!question || state.isBusy) {
        return;
      }

      appendMessage('user', question);
      input.value = '';
      input.style.height = '';
      setBusy(true);
      setStatus(true);
      showThinking();

      try {
        const docs = await ensureSearchIndex();
        const selectedDocs = selectRelevantDocs(question, docs);
        const response = await generateAnswer(question, selectedDocs);
        clearThinking();
        appendMessage('assistant', response, selectedDocs);
        state.history.push({ role: 'user', content: question });
        state.history.push({ role: 'assistant', content: response });
        state.history = state.history.slice(-MAX_HISTORY_TURNS * 2);
      } catch (error) {
        clearThinking();
        const message = error instanceof Error ? error.message : '请求失败，请检查配置或网络连接。';
        appendMessage('assistant', `请求失败：${message}`);
        setStatus(false);
      } finally {
        setBusy(false);
      }
    });

    input.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = `${Math.min(input.scrollHeight, 140)}px`;
    });

    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        form.requestSubmit();
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && state.isOpen) {
        setPanelOpen(false);
      }
    });
  }

  function setPanelOpen(open) {
    state.isOpen = open;
    root.classList.toggle('yat-agent--open', open);
    fab.setAttribute('aria-expanded', String(open));
    if (open) {
      dismissNudge(false);
    }
    if (open) {
      input.focus();
    }
  }

  function setBusy(busy) {
    state.isBusy = busy;
    submitButton.disabled = busy;
    input.disabled = busy;
  }

  function setStatus(ready) {
    if (!statusEl) {
      return;
    }
    statusEl.dataset.ready = ready ? 'true' : 'false';
  }

  function hydrateNudge() {
    if (!nudge) {
      return;
    }
    const dismissed = localStorage.getItem(NUDGE_STORAGE_KEY) === '1';
    nudge.hidden = dismissed;
  }

  function dismissNudge(persist = true) {
    if (!nudge) {
      return;
    }
    nudge.hidden = true;
    if (persist) {
      localStorage.setItem(NUDGE_STORAGE_KEY, '1');
    }
  }

  async function ensureSearchIndex() {
    if (state.searchIndex) {
      return state.searchIndex;
    }

    const url = root.dataset.searchIndexUrl;
    const response = await fetch(url, { credentials: 'same-origin' });
    if (!response.ok) {
      throw new Error(`无法加载搜索索引：${response.status}`);
    }

    const payload = await response.json();
    state.searchIndex = Array.isArray(payload.docs) ? payload.docs : [];
    return state.searchIndex;
  }

  function selectRelevantDocs(question, docs) {
    const currentPage = root.dataset.currentPage || '';
    const normalizedQuestion = normalize(question);
    const terms = buildTerms(normalizedQuestion);

    const ranked = docs
      .map((doc) => ({ doc, score: scoreDoc(doc, normalizedQuestion, terms, currentPage) }))
      .filter((entry) => entry.score > 0)
      .sort((left, right) => right.score - left.score)
      .slice(0, MAX_CONTEXT_DOCS)
      .map((entry) => ({
        title: entry.doc.title || '未命名文档',
        location: entry.doc.location || '',
        text: buildExcerpt(entry.doc.text || '', terms),
      }));

    if (!ranked.length) {
      return [
        {
          title: root.dataset.currentTitle || '当前页面',
          location: currentPage,
          text: buildExcerpt(document.querySelector('.md-content .md-typeset')?.textContent || '', terms),
        },
      ];
    }

    return ranked;
  }

  function scoreDoc(doc, question, terms, currentPage) {
    const title = normalize(doc.title || '');
    const text = normalize(doc.text || '');
    const location = normalize(doc.location || '');
    let score = 0;

    if (question && title.includes(question)) {
      score += 24;
    }
    if (question && text.includes(question)) {
      score += 12;
    }
    if (location.includes(normalize(currentPage))) {
      score += 5;
    }

    for (const term of terms) {
      if (term.length < 2) {
        continue;
      }
      if (title.includes(term)) {
        score += 8;
      }
      if (location.includes(term)) {
        score += 5;
      }
      if (text.includes(term)) {
        score += 2;
      }
    }

    return score;
  }

  function buildTerms(text) {
    const asciiTerms = text.match(/[a-z0-9_./-]+/g) || [];
    const cjkMatches = text.match(/[\u4e00-\u9fff]{2,}/g) || [];
    const cjkTerms = [];
    for (const chunk of cjkMatches) {
      cjkTerms.push(chunk);
      for (let index = 0; index < chunk.length - 1; index += 1) {
        cjkTerms.push(chunk.slice(index, index + 2));
      }
    }
    return Array.from(new Set([...asciiTerms, ...cjkTerms])).slice(0, 24);
  }

  function buildExcerpt(text, terms) {
    const plain = text.replace(/\s+/g, ' ').trim();
    if (!plain) {
      return '该条目未提供可用摘要。';
    }

    const normalized = normalize(plain);
    const anchor = terms.find((term) => term.length > 1 && normalized.includes(term));
    if (!anchor) {
      return plain.slice(0, 420);
    }

    const index = normalized.indexOf(anchor);
    const start = Math.max(0, index - 120);
    const end = Math.min(plain.length, index + 280);
    const prefix = start > 0 ? '... ' : '';
    const suffix = end < plain.length ? ' ...' : '';
    return `${prefix}${plain.slice(start, end)}${suffix}`;
  }

  async function generateAnswer(question, docs) {
    const client = new OpenAI({
      apiKey: OPENAI_CONFIG.apiKey,
      baseURL: OPENAI_CONFIG.baseURL,
      dangerouslyAllowBrowser: true,
    });

    const contextBlock = docs
      .map((doc, index) => `${index + 1}. 标题：${doc.title}\n链接：${doc.location}\n摘要：${doc.text}`)
      .join('\n\n');

    const conversation = state.history
      .slice(-MAX_HISTORY_TURNS * 2)
      .map((item) => `${item.role === 'user' ? '用户' : '助手'}：${item.content}`)
      .join('\n');

    const prompt = [
      '当前页面：',
      `${root.dataset.currentTitle || '未命名页面'} (${root.dataset.currentPage || ''})`,
      '',
      conversation ? `历史对话：\n${conversation}\n` : '',
      `文档检索结果：\n${contextBlock}`,
      '',
      `用户问题：${question}`,
    ]
      .filter(Boolean)
      .join('\n');

    const completion = await client.chat.completions.create({
      model: OPENAI_CONFIG.model,
      messages: [
        {
          role: 'system',
          content:
            '你是 YatCC 文档站的智能助手。只能依据提供的文档上下文回答，不能编造站内不存在的事实。优先使用中文，回答要直接、清晰。如果上下文不足，请明确说明，并建议用户查看最相关的文档。在回答最后追加“参考文档：”一行，并列出你实际使用到的页面标题与链接。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content = completion.choices?.[0]?.message?.content;

    if (typeof content === 'string') {
      return content.trim() || '模型没有返回可显示的文本。';
    }

    if (Array.isArray(content)) {
      const merged = content
        .map((part) => (typeof part === 'string' ? part : part?.text || ''))
        .join('')
        .trim();
      return merged || '模型没有返回可显示的文本。';
    }

    return '模型没有返回可显示的文本。';
  }

  function showThinking() {
    clearThinking();
    const article = document.createElement('article');
    article.className = 'yat-agent__message yat-agent__message--assistant yat-agent__message--thinking';
    article.innerHTML = '<div class="yat-agent__thinking" aria-label="思考中"><span></span><span></span><span></span></div>';
    messagesEl.appendChild(article);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    state.thinkingEl = article;
  }

  function clearThinking() {
    if (state.thinkingEl) {
      state.thinkingEl.remove();
      state.thinkingEl = null;
    }
  }

  function appendMessage(role, text, docs = []) {
    const article = document.createElement('article');
    article.className = `yat-agent__message yat-agent__message--${role}`;
    article.style.alignSelf = role === 'user' ? 'end' : 'start';

    const body = document.createElement('div');
    body.className = 'yat-agent__message-body';
    body.textContent = text;
    article.appendChild(body);

    if (role === 'assistant' && docs.length) {
      const sources = document.createElement('div');
      sources.className = 'yat-agent__sources';
      for (const doc of docs) {
        const link = document.createElement('a');
        link.className = 'yat-agent__source';
        link.href = doc.location;
        link.textContent = doc.title;
        sources.appendChild(link);
      }
      article.appendChild(sources);
    }

    messagesEl.appendChild(article);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function normalize(value) {
    return String(value || '').toLowerCase();
  }
}