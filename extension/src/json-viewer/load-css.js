var Promise = require('promise');
var chrome = require("chrome-framework");
var MAX_WAIT = 20;

function loadCSS(opts) {
  var url = chrome.runtime.getURL(opts.path);

  // Try to fetch the CSS content and inject it as a style element
  return new Promise(function(resolve, reject) {
    fetch(url)
      .then(function(response) {
        if (!response.ok) {
          throw new Error('Failed to fetch CSS: ' + response.status);
        }
        return response.text();
      })
      .then(function(cssText) {
        var style = document.createElement("style");
        style.type = "text/css";
        if (opts.id) style.id = opts.id;
        style.textContent = cssText;
        
        // Try to append to head, fallback to body if CSP blocks it
        try {
          document.head.appendChild(style);
        } catch (e) {
          console.warn('[JSONViewer] CSP blocked head injection, trying body:', e);
          try {
            document.body.appendChild(style);
          } catch (e2) {
            console.error('[JSONViewer] Failed to inject CSS:', e2);
            return reject(e2);
          }
        }
        
        resolve();
      })
      .catch(function(error) {
        console.error('[JSONViewer] Failed to load CSS:', error);
        reject(error);
      });
  });
}

module.exports = loadCSS;
