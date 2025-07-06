var chrome = require('chrome-framework');
var svgGear = require('./svg-gear');
var svgRaw = require('./svg-raw');
var svgUnfold = require('./svg-unfold');
var svgCopy = require('./svg-copy');

function renderExtras(pre, options, highlighter) {
  var extras = document.createElement("div");
  extras.className = "extras";

  if (!options.addons.autoHighlight) {
    extras.className += ' auto-highlight-off';
  }

  var optionsLink = document.createElement("a");
  optionsLink.className = "json_viewer icon gear";
  optionsLink.href = chrome.extension.getURL("/pages/options.html");
  optionsLink.target = "_blank";
  optionsLink.title = "Options";
  optionsLink.innerHTML = svgGear;

  var rawLink = document.createElement("a");
  rawLink.className = "json_viewer icon raw";
  rawLink.href = "#";
  rawLink.title = "Original JSON toggle";
  rawLink.innerHTML = svgRaw;
  rawLink.onclick = function(e) {
    e.preventDefault();
    var editor = document.getElementsByClassName('CodeMirror')[0];

    if (pre.hidden) {
      // Raw enabled
      highlighter.hide();
      pre.hidden = false;
      extras.className += ' auto-highlight-off';

    } else {
      // Raw disabled
      highlighter.show();
      pre.hidden = true;
      extras.className = extras.className.replace(/\s+auto-highlight-off/, '');
    }
  }

  var unfoldLink = document.createElement("a");
  unfoldLink.className = "json_viewer icon unfold";
  unfoldLink.href = "#";
  unfoldLink.title = "Fold/Unfold all toggle";
  unfoldLink.innerHTML = svgUnfold;
  unfoldLink.onclick = function(e) {
    e.preventDefault();
    var value = pre.getAttribute('data-folded')

    if (value === 'true' || value === true) {
      highlighter.unfoldAll();
      pre.setAttribute('data-folded', false)

    } else {
      highlighter.fold();
      pre.setAttribute('data-folded', true)
    }
  }

  var copyLink = document.createElement("a");
  copyLink.className = "json_viewer icon copy";
  copyLink.href = "#";
  copyLink.title = "Copy JSON (click for options)";
  copyLink.innerHTML = svgCopy;
  
  // Create copy menu
  var copyMenu = document.createElement("div");
  copyMenu.className = "json_viewer copy-menu";
  copyMenu.style.cssText = "display:none;position:absolute;background:#fff;border:1px solid #ccc;box-shadow:0 2px 5px rgba(0,0,0,0.2);z-index:1000;";
  
  var menuOptions = [
    { text: "Copy as JSON", format: "json" },
    { text: "Copy as Formatted JSON", format: "formatted" },
    { text: "Copy as Compact JSON", format: "compact" },
    { text: "Copy as CSV (if array)", format: "csv" },
    { text: "Copy as URL Parameters", format: "urlparams" }
  ];
  
  menuOptions.forEach(function(option) {
    var menuItem = document.createElement("a");
    menuItem.href = "#";
    menuItem.style.cssText = "display:block;padding:8px 16px;color:#333;text-decoration:none;font-size:12px;font-family:monospace;";
    menuItem.innerHTML = option.text;
    menuItem.onmouseover = function() { this.style.backgroundColor = "#f0f0f0"; };
    menuItem.onmouseout = function() { this.style.backgroundColor = "transparent"; };
    menuItem.onclick = function(e) {
      e.preventDefault();
      copyMenu.style.display = "none";
      copyWithFormat(pre, option.format, copyLink);
    };
    copyMenu.appendChild(menuItem);
  });
  
  document.body.appendChild(copyMenu);
  
  copyLink.onclick = function(e) {
    e.preventDefault();
    e.stopPropagation();
    
    // Position menu below the copy icon
    var rect = copyLink.getBoundingClientRect();
    copyMenu.style.left = rect.left + "px";
    copyMenu.style.top = (rect.bottom + 5) + "px";
    copyMenu.style.display = copyMenu.style.display === "none" ? "block" : "none";
  };
  
  // Close menu when clicking elsewhere
  document.addEventListener("click", function(e) {
    if (!copyLink.contains(e.target) && !copyMenu.contains(e.target)) {
      copyMenu.style.display = "none";
    }
  });
  
  function copyWithFormat(pre, format, copyLink) {
    var textToCopy = pre.textContent || pre.innerText;
    var formattedText = textToCopy;
    
    try {
      var jsonData = JSON.parse(textToCopy);
      
      switch(format) {
        case "formatted":
          formattedText = JSON.stringify(jsonData, null, 2);
          break;
        case "compact":
          formattedText = JSON.stringify(jsonData);
          break;
        case "csv":
          if (Array.isArray(jsonData) && jsonData.length > 0) {
            formattedText = jsonToCSV(jsonData);
          } else {
            alert("CSV export requires an array of objects");
            return;
          }
          break;
        case "urlparams":
          formattedText = jsonToURLParams(jsonData);
          break;
        default:
          formattedText = textToCopy;
      }
    } catch (e) {
      console.error("Failed to parse JSON:", e);
      // Fall back to raw text
    }
    
    // Create a temporary textarea to copy from
    var textarea = document.createElement('textarea');
    textarea.value = formattedText;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    
    try {
      document.execCommand('copy');
      // Provide visual feedback
      copyLink.style.opacity = '0.5';
      setTimeout(function() {
        copyLink.style.opacity = '1';
      }, 200);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
    
    document.body.removeChild(textarea);
  }
  
  function jsonToCSV(jsonArray) {
    if (!jsonArray || jsonArray.length === 0) return '';
    
    // Get headers from first object
    var headers = Object.keys(jsonArray[0]);
    var csv = headers.join(',') + '\n';
    
    // Add data rows
    jsonArray.forEach(function(obj) {
      var row = headers.map(function(header) {
        var value = obj[header];
        // Escape values that contain commas or quotes
        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
          value = '"' + value.replace(/"/g, '""') + '"';
        }
        return value !== undefined ? value : '';
      });
      csv += row.join(',') + '\n';
    });
    
    return csv;
  }
  
  function jsonToURLParams(obj) {
    var params = [];
    
    function addParam(key, value) {
      if (value !== null && value !== undefined) {
        params.push(encodeURIComponent(key) + '=' + encodeURIComponent(value));
      }
    }
    
    function processObject(obj, prefix) {
      Object.keys(obj).forEach(function(key) {
        var value = obj[key];
        var fullKey = prefix ? prefix + '[' + key + ']' : key;
        
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          processObject(value, fullKey);
        } else if (Array.isArray(value)) {
          value.forEach(function(item, index) {
            addParam(fullKey + '[' + index + ']', item);
          });
        } else {
          addParam(fullKey, value);
        }
      });
    }
    
    processObject(obj, '');
    return params.join('&');
  }

  extras.appendChild(optionsLink);
  extras.appendChild(copyLink);
  extras.appendChild(rawLink);

  // "awaysFold" was a typo but to avoid any problems I'll keep it
  // a while
  pre.setAttribute('data-folded', options.addons.alwaysFold || options.addons.awaysFold)
  extras.appendChild(unfoldLink);

  document.body.appendChild(extras);
}

module.exports = renderExtras;
