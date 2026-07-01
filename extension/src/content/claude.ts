// Kyro: Lightweight Claude Interceptor
function getPromptTextArea(): HTMLDivElement | HTMLTextAreaElement | null {
  return (
    (document.querySelector('div[contenteditable="true"].ProseMirror') as HTMLDivElement) ||
    (document.querySelector('div[contenteditable="true"]') as HTMLDivElement) ||
    (document.querySelector('p[data-placeholder="Reply to Claude..."]') as HTMLDivElement)
  );
}

function getSendButton(): HTMLButtonElement | null {
  return (
    document.querySelector('button[aria-label="Send Message"]') ||
    document.querySelector('button[aria-label="Send message"]')
  ) as HTMLButtonElement | null;
}

function sendToKyro(text: string) {
  if (!text || text.trim().length < 5) return;
  chrome.runtime.sendMessage({
    type: "CAPTURE_CONTEXT",
    data: {
      url: window.location.href,
      title: `Claude Prompt`,
      text: `User Prompt: ${text.trim()}`,
      domain: 'claude.ai',
      timestamp: new Date().toISOString(),
      type: "chat_prompt"
    }
  });
  console.log("[Kyro] Intercepted Claude prompt.");
}

function interceptClaude() {
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      const activeEl = document.activeElement;
      const textArea = getPromptTextArea();
      if (activeEl === textArea || textArea?.contains(activeEl)) {
        sendToKyro(textArea?.innerText || "");
      }
    }
  }, true);

  document.addEventListener('click', (e) => {
    const sendBtn = getSendButton();
    const target = e.target as HTMLElement;
    if (sendBtn && (target === sendBtn || sendBtn.contains(target))) {
      const textArea = getPromptTextArea();
      sendToKyro(textArea?.innerText || "");
    }
  }, true);
}

interceptClaude();
