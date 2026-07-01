// Kyro: Lightweight Perplexity Interceptor
function getPromptTextArea(): HTMLTextAreaElement | null {
  return document.querySelector('textarea') as HTMLTextAreaElement | null;
}

function getSendButton(): HTMLButtonElement | null {
  return (
    document.querySelector('button[aria-label="Submit"]') ||
    document.querySelector('button[type="submit"]') ||
    document.querySelector('button svg.fa-arrow-up')?.closest('button')
  ) as HTMLButtonElement | null;
}

function sendToKyro(text: string) {
  if (!text || text.trim().length < 5) return;
  chrome.runtime.sendMessage({
    type: "CAPTURE_CONTEXT",
    data: {
      url: window.location.href,
      title: `Perplexity Prompt`,
      text: `User Prompt: ${text.trim()}`,
      domain: 'perplexity.ai',
      timestamp: new Date().toISOString(),
      type: "chat_prompt"
    }
  });
  console.log("[Kyro] Intercepted Perplexity prompt.");
}

function interceptPerplexity() {
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      const activeEl = document.activeElement;
      const textArea = getPromptTextArea();
      if (activeEl === textArea || textArea?.contains(activeEl)) {
        sendToKyro(textArea?.value || "");
      }
    }
  }, true);

  document.addEventListener('click', (e) => {
    const sendBtn = getSendButton();
    const target = e.target as HTMLElement;
    if (sendBtn && (target === sendBtn || sendBtn.contains(target))) {
      const textArea = getPromptTextArea();
      sendToKyro(textArea?.value || "");
    }
  }, true);
}

interceptPerplexity();
