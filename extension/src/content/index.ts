function extractMainContent(): string {
  // Try to find the main content container
  const selectors = ['article', 'main', '.markdown-body', '.post-content', '#content', '[role="main"]'];
  let contentElement: HTMLElement | null = null;
  
  for (const selector of selectors) {
    contentElement = document.querySelector(selector);
    if (contentElement) break;
  }

  // Fallback to grabbing all paragraphs if no semantic main container is found
  if (!contentElement) {
    const paragraphs = Array.from(document.querySelectorAll('p'));
    return paragraphs.map(p => p.innerText.trim()).filter(text => text.length > 50).join('\\n\\n');
  }

  return contentElement.innerText.trim();
}

function captureContext() {
  const url = window.location.href;
  const title = document.title;
  const content = extractMainContent();
  
  if (content.length < 100) {
    console.log("[Kyro] Page content too short, skipping capture.");
    return;
  }

  const data = {
    url,
    title,
    text: content,
    domain: window.location.hostname,
    timestamp: new Date().toISOString(),
    type: "page_view"
  };

  chrome.runtime.sendMessage({
    type: "CAPTURE_CONTEXT",
    data
  });
}

// Initial capture on page load with slight delay to allow SPA frameworks to render
setTimeout(captureContext, 2000);

// Listen for text selection
document.addEventListener('selectionchange', () => {
  const selection = window.getSelection()?.toString();
  if (selection && selection.length > 50) {
    chrome.runtime.sendMessage({
      type: "CAPTURE_CONTEXT",
      data: {
        text: selection,
        url: window.location.href,
        title: `Selection from: ${document.title}`,
        timestamp: new Date().toISOString(),
        type: "selection",
        domain: window.location.hostname
      }
    });
  }
});
