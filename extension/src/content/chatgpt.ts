// Kyro: Lightweight ChatGPT Interceptor
// Adapted from mem0 reference selectors

function getPromptTextArea(): HTMLTextAreaElement | HTMLDivElement | null {
  return (
    (document.querySelector('#prompt-textarea') as HTMLTextAreaElement | HTMLDivElement) ||
    (document.querySelector('div[contenteditable="true"]') as HTMLDivElement) ||
    (document.querySelector('textarea') as HTMLTextAreaElement)
  );
}

function getSendButton(): HTMLButtonElement | null {
  return document.querySelector('#composer-submit-button') || document.querySelector('[data-testid="send-button"]');
}

function sendToKyro(text: string) {
  if (!text || text.trim().length < 5) return;

  const data = {
    url: window.location.href,
    title: `ChatGPT Prompt`,
    text: `User Prompt: ${text.trim()}`,
    domain: 'chatgpt.com',
    timestamp: new Date().toISOString(),
    type: "chat_prompt"
  };

  chrome.runtime.sendMessage({
    type: "CAPTURE_CONTEXT",
    data
  });
  console.log("[Kyro] Intercepted ChatGPT prompt and sent to memory pipeline.");
}

function interceptChatGPT() {
  console.log("[Kyro] Initializing ChatGPT Interceptor...");

  // Intercept via Enter key on textarea
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      const activeEl = document.activeElement;
      const textArea = getPromptTextArea();
      if (activeEl === textArea || textArea?.contains(activeEl)) {
        // Send a slight delay to ensure we grab the final text before it clears
        let text = "";
        if (textArea instanceof HTMLTextAreaElement) {
          text = textArea.value;
        } else if (textArea) {
          text = textArea.innerText;
        }
        sendToKyro(text);
      }
    }
  }, true);

  // Intercept via Click on Send button
  document.addEventListener('click', (e) => {
    const sendBtn = getSendButton();
    const target = e.target as HTMLElement;
    if (sendBtn && (target === sendBtn || sendBtn.contains(target))) {
      const textArea = getPromptTextArea();
      let text = "";
      if (textArea instanceof HTMLTextAreaElement) {
        text = textArea.value;
      } else if (textArea) {
        text = textArea.innerText;
      }
      sendToKyro(text);
    }
  }, true);
}

// Start interceptor
interceptChatGPT();

// --- Kyro Retrieval UI Overlay ---
let lookupTimeout: number | null = null;
let overlayContainer: HTMLElement | null = null;

function createOverlay() {
  if (overlayContainer) return overlayContainer;

  overlayContainer = document.createElement('div');
  overlayContainer.id = 'kyro-memory-overlay';
  overlayContainer.style.cssText = `
    position: absolute;
    bottom: 100%;
    left: 0;
    width: 100%;
    max-height: 250px;
    overflow-y: auto;
    background: #1e1e2e;
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 12px;
    margin-bottom: 8px;
    z-index: 10000;
    display: none;
    flex-direction: column;
    box-shadow: 0 -10px 40px rgba(0,0,0,0.5);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  `;

  const header = document.createElement('div');
  header.style.cssText = `
    padding: 8px 12px;
    font-size: 11px;
    font-weight: 600;
    color: #a855f7;
    border-bottom: 1px solid rgba(255,255,255,0.05);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  `;
  header.innerText = "✨ Kyro Context Retrieved";

  const contentList = document.createElement('div');
  contentList.id = 'kyro-memory-list';
  contentList.style.cssText = `
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  `;

  overlayContainer.appendChild(header);
  overlayContainer.appendChild(contentList);

  return overlayContainer;
}

function showMemories(memories: string[], textArea: HTMLElement) {
  const container = createOverlay();
  const list = container.querySelector('#kyro-memory-list') as HTMLElement;
  list.innerHTML = ''; // clear old

  if (memories.length === 0) {
    container.style.display = 'none';
    return;
  }

  memories.forEach(mem => {
    const item = document.createElement('div');
    item.style.cssText = `
      padding: 10px;
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.05);
      border-radius: 8px;
      color: #e2e8f0;
      font-size: 13px;
      line-height: 1.4;
      cursor: pointer;
      transition: all 0.2s;
    `;
    item.innerText = mem;

    // Hover effects
    item.addEventListener('mouseenter', () => {
      item.style.background = 'rgba(168,85,247,0.1)';
      item.style.borderColor = 'rgba(168,85,247,0.3)';
    });
    item.addEventListener('mouseleave', () => {
      item.style.background = 'rgba(255,255,255,0.03)';
      item.style.borderColor = 'rgba(255,255,255,0.05)';
    });

    // Manual Injection Click Handler
    item.addEventListener('click', () => {
      const injectionText = `\n\n[Kyro Context]: ${mem}\n`;
      if (textArea instanceof HTMLTextAreaElement) {
        textArea.value = textArea.value + injectionText;
        textArea.dispatchEvent(new Event('input', { bubbles: true })); // trigger react
      } else {
        textArea.innerText = textArea.innerText + injectionText;
        textArea.dispatchEvent(new Event('input', { bubbles: true }));
      }
      container.style.display = 'none';
    });

    list.appendChild(item);
  });

  // Mount overlay relatively to the text area's parent container
  const parent = textArea.closest('form') || textArea.parentElement;
  if (parent) {
    parent.style.position = 'relative'; // Ensure absolute positioning works
    parent.appendChild(container);
    container.style.display = 'flex';
  }
}

// Attach input listener for typing to trigger lookup
document.addEventListener('input', (e) => {
  const target = e.target as HTMLElement;
  const textArea = getPromptTextArea();

  if (textArea && (target === textArea || textArea.contains(target))) {
    let text = "";
    if (textArea instanceof HTMLTextAreaElement) text = textArea.value;
    else text = textArea.innerText;

    if (lookupTimeout) clearTimeout(lookupTimeout);

    if (text.trim().length > 10) { // Only lookup if they typed a decent amount
      lookupTimeout = window.setTimeout(() => {
        chrome.runtime.sendMessage(
          { type: "RETRIEVE_CONTEXT", query: text },
          (response) => {
            if (response && response.status === "success" && response.memories) {
              showMemories(response.memories, textArea);
            }
          }
        );
      }, 800); // 800ms debounce
    } else {
      if (overlayContainer) overlayContainer.style.display = 'none';
    }
  }
}, true);
