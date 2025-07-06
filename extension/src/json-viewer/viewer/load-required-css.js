var Promise = require('promise');
var loadCss = require('../load-css');
var themeDarkness = require('../theme-darkness');

function resolveTheme(theme) {
  if (theme === 'auto') {
    if (typeof window !== 'undefined' && window.matchMedia) {
      var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      return prefersDark ? 'cobalt' : 'default';
    }
    return 'default'; // Fallback if matchMedia not available
  }
  return theme;
}

function loadRequiredCss(options) {
  var theme = resolveTheme(options.theme);
  var loaders = [];
  loaders.push(loadCss({
    path: "assets/viewer.css",
    checkClass: "json-viewer-css-check"
  }));

  if (theme && theme !== "default") {
    var themePath = "themes/" + themeDarkness(theme) + "/" + theme + ".css";
    loaders.push(loadCss({
      path: themePath,
      checkClass: "theme-" + theme + "-css-check"
    }));
  }

  return Promise.all(loaders).then(function() {
    var style = document.createElement("style");
    style.rel = "stylesheet";
    style.type = "text/css";
    style.textContent = options.style;
    
    // Try to append to head, fallback to body if CSP blocks it
    try {
      document.head.appendChild(style);
    } catch (e) {
      console.warn('[JSONViewer] CSP blocked head injection for custom styles, trying body:', e);
      try {
        document.body.appendChild(style);
      } catch (e2) {
        console.error('[JSONViewer] Failed to inject custom styles:', e2);
        // Continue anyway, the extension might still work without custom styles
      }
    }
  });
}

module.exports = loadRequiredCss;
