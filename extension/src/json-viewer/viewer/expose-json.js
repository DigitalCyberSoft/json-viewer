function exposeJson(text, outsideViewer) {
  console.info("[JSONViewer] Your json was stored into 'window.json', enjoy!");

  // Always use direct assignment instead of script injection
  // This is CSP-compliant and works in both cases
  try {
    window.json = JSON.parse(text);
  } catch (e) {
    console.warn("[JSONViewer] Failed to parse JSON for window.json:", e);
    // Fallback: expose the raw text
    window.json = text;
  }
}

module.exports = exposeJson;
