// Kyro: Lightweight Gemini Interceptor
function getPromptTextArea(): HTMLElement | null {
  return (
    document.querySelector('.text-input-field') ||
    document.querySelector('.gmat-mdc-text-field') ||
    document.querySelector('rich-textarea') ||
    document.querySelector('div[contenteditable="true"]')
  ) as HTMLElement | null;
}

function getSendButton(): HTMLButtonElement | null {
  return (
    document.querySelector('button[aria-label="Send message"]') ||
    document.querySelector('.send-button')
  ) as HTMLButtonElement | null;
}

function sendToKyro(text: string) {
  if (!text || text.trim().length < 5) return;
  chrome.runtime.sendMessage({
    type: "CAPTURE_CONTEXT",
    data: {
      url: window.location.href,
      title: `Gemini Prompt`,
      text: `User Prompt: ${text.trim()}`,
      domain: 'gemini.google.com',
      timestamp: new Date().toISOString(),
      type: "chat_prompt"
    }
  });
  console.log("[Kyro] Intercepted Gemini prompt.");
}

function interceptGemini() {
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      const activeEl = document.activeElement;
      const textArea = getPromptTextArea();
      if (activeEl === textArea || textArea?.contains(activeEl)) {
        let text = "";
        if (textArea instanceof HTMLTextAreaElement) text = textArea.value;
        else if (textArea) text = textArea.innerText;
        sendToKyro(text);
      }
    }
  }, true);

  document.addEventListener('click', (e) => {
    const sendBtn = getSendButton();
    const target = e.target as HTMLElement;
    if (sendBtn && (target === sendBtn || sendBtn.contains(target))) {
      const textArea = getPromptTextArea();
      let text = "";
      if (textArea instanceof HTMLTextAreaElement) text = textArea.value;
      else if (textArea) text = textArea.innerText;
      sendToKyro(text);
    }
  }, true);
}

interceptGemini();
