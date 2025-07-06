// Service worker for Manifest V3
// Combines functionality from backend.js and omnibox.js

var Storage = require('./json-viewer/storage');

// Message listener for options
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  try {
    if (request.action === "GET_OPTIONS") {
      Storage.loadAsync(function(options) {
        sendResponse({err: null, value: options});
      });
      return true; // Will respond asynchronously
    }
  } catch(e) {
    console.error('[JSONViewer] error: ' + e.message, e);
    sendResponse({err: e});
  }
});

// Omnibox functionality
chrome.omnibox.onInputChanged.addListener(function(text, suggest) {
  console.log('[JSONViewer] inputChanged: ' + text);
  suggest([
    {
      content: "Format JSON",
      description: "(Format JSON) Open a page with json highlighted"
    },
    {
      content: "Scratch pad",
      description: "(Scratch pad) Area to write and format/highlight JSON"
    }
  ]);
});

chrome.omnibox.onInputEntered.addListener(function(text) {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    var omniboxUrl = chrome.runtime.getURL("/pages/omnibox.html");
    var path = /scratch pad/i.test(text) ? "?scratch-page=true" : "?json=" + encodeURIComponent(text);
    var url = omniboxUrl + path;
    console.log("[JSONViewer] Opening: " + url);

    chrome.tabs.update(tabs[0].id, {url: url});
  });
});