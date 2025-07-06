require('./viewer-styles');
var JSONUtils = require('./json-viewer/check-if-json');
var highlightContent = require('./json-viewer/highlight-content');
var Storage = require('./json-viewer/storage');

function checkFileUrlAccess() {
  // Check if we're on a file:// URL
  if (window.location.protocol === 'file:') {
    // Try to access the document to see if we have permission
    try {
      // If we can access document.body, we have permission
      if (document.body) {
        return true;
      }
    } catch (e) {
      // Permission denied
      return false;
    }
    
    // Additional check: if the extension can't inject properly, body might be null
    if (!document.body || document.body.childNodes.length === 0) {
      // Create a message for the user
      var message = document.createElement('div');
      message.style.cssText = 'padding: 20px; margin: 20px; border: 2px solid #ff6b6b; background: #ffe0e0; color: #333; font-family: monospace; border-radius: 5px;';
      message.innerHTML = '<h2>JSON Viewer: Local File Access Required</h2>' +
        '<p>To view local JSON files, you need to enable file access for this extension:</p>' +
        '<ol>' +
        '<li>Go to chrome://extensions/</li>' +
        '<li>Find "JSON Viewer"</li>' +
        '<li>Click "Details"</li>' +
        '<li>Enable "Allow access to file URLs"</li>' +
        '<li>Reload this page</li>' +
        '</ol>';
      
      // Try to append to body, or create one if it doesn't exist
      if (!document.body) {
        document.documentElement.appendChild(document.createElement('body'));
      }
      document.body.appendChild(message);
      return false;
    }
  }
  return true;
}

function isInIframe() {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true;
  }
}

function onLoad() {
  // Check file URL access first
  if (!checkFileUrlAccess()) {
    return;
  }
  
  // Check if we're in an iframe and if iframe processing is enabled
  if (isInIframe()) {
    Storage.loadAsync(function(options) {
      if (!options.addons.processIframes) {
        if (process.env.NODE_ENV === 'development') {
          console.debug("[JSONViewer] Iframe processing disabled via settings");
        }
        return;
      }
      
      JSONUtils.checkIfJson(function(pre) {
        pre.hidden = true;
        highlightContent(pre);
      });
    });
  } else {
    // Not in iframe, proceed normally
    JSONUtils.checkIfJson(function(pre) {
      pre.hidden = true;
      highlightContent(pre);
    });
  }
}

document.addEventListener("DOMContentLoaded", onLoad, false);
