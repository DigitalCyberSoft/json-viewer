var chrome = require('chrome-framework');
var svgGear = require('./svg-gear');
var svgRaw = require('./svg-raw');
var svgUnfold = require('./svg-unfold');
var svgCopy = require('./svg-copy');
var jsonpath = require('jsonpath');

function renderExtras(pre, options, highlighter) {
  var extras = document.createElement("div");
  extras.className = "extras";

  if (!options.addons.autoHighlight) {
    extras.className += ' auto-highlight-off';
  }

  var optionsLink = document.createElement("a");
  optionsLink.className = "json_viewer icon gear";
  optionsLink.href = chrome.runtime.getURL("/pages/options.html");
  optionsLink.target = "_blank";
  optionsLink.title = "Options";
  optionsLink.innerHTML = svgGear;

  var rawLink = document.createElement("a");
  rawLink.className = "json_viewer icon raw";
  rawLink.href = "#";
  rawLink.title = "Original JSON toggle";
  rawLink.innerHTML = svgRaw;
  rawLink.addEventListener('click', function(e) {
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
  });

  var unfoldLink = document.createElement("a");
  unfoldLink.className = "json_viewer icon unfold";
  unfoldLink.href = "#";
  unfoldLink.title = "Fold/Unfold all toggle";
  unfoldLink.innerHTML = svgUnfold;
  unfoldLink.addEventListener('click', function(e) {
    e.preventDefault();
    var value = pre.getAttribute('data-folded')

    if (value === 'true' || value === true) {
      highlighter.unfoldAll();
      pre.setAttribute('data-folded', false)

    } else {
      highlighter.fold();
      pre.setAttribute('data-folded', true)
    }
  });

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
    
    menuItem.addEventListener('mouseover', function() { 
      this.style.backgroundColor = "#f0f0f0"; 
    });
    menuItem.addEventListener('mouseout', function() { 
      this.style.backgroundColor = "transparent"; 
    });
    menuItem.addEventListener('click', function(e) {
      e.preventDefault();
      copyMenu.style.display = "none";
      copyWithFormat(pre, option.format, copyLink);
    });
    
    copyMenu.appendChild(menuItem);
  });
  
  document.body.appendChild(copyMenu);
  
  copyLink.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    
    // Position menu below the copy icon
    var rect = copyLink.getBoundingClientRect();
    var menuWidth = 200; // Approximate menu width
    var viewportWidth = window.innerWidth;
    
    // Check if menu would go off-screen on the right
    var leftPosition = rect.left;
    if (rect.left + menuWidth > viewportWidth) {
      // Position menu to the left of the button instead
      leftPosition = rect.right - menuWidth;
    }
    
    copyMenu.style.left = leftPosition + "px";
    copyMenu.style.top = (rect.bottom + 5) + "px";
    copyMenu.style.display = copyMenu.style.display === "none" ? "block" : "none";
  });
  
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

  // JSONPath filter functionality
  var jsonPathContainer = document.createElement("div");
  jsonPathContainer.className = "json_viewer jsonpath-container";
  jsonPathContainer.style.cssText = "display: flex; align-items: center; margin-bottom: 10px; gap: 8px;";
  
  var jsonPathLabel = document.createElement("label");
  jsonPathLabel.innerHTML = "Filter:";
  jsonPathLabel.style.cssText = "font-family: monospace; font-size: 12px; color: #666;";
  
  var filterTypeSelect = document.createElement("select");
  filterTypeSelect.className = "json_viewer filter-type";
  filterTypeSelect.style.cssText = "padding: 4px; border: 1px solid #ccc; border-radius: 3px; font-size: 12px; margin-right: 8px;";
  filterTypeSelect.innerHTML = '<option value="jsonpath">JSONPath</option><option value="keys">Filter Keys</option><option value="values">Filter Values</option>';
  
  var jsonPathInput = document.createElement("input");
  jsonPathInput.type = "text";
  jsonPathInput.placeholder = "e.g., $.users[*].name or $.data.items[0:3]";
  jsonPathInput.className = "json_viewer jsonpath-input";
  jsonPathInput.style.cssText = "flex: 1; padding: 4px 8px; border: 1px solid #ccc; border-radius: 3px; font-family: monospace; font-size: 12px;";
  
  var jsonPathApplyBtn = document.createElement("button");
  jsonPathApplyBtn.innerHTML = "Apply";
  jsonPathApplyBtn.className = "json_viewer jsonpath-apply";
  jsonPathApplyBtn.style.cssText = "padding: 4px 12px; border: 1px solid #007acc; background: #007acc; color: white; border-radius: 3px; font-size: 12px; cursor: pointer;";
  
  var jsonPathClearBtn = document.createElement("button");
  jsonPathClearBtn.innerHTML = "Clear";
  jsonPathClearBtn.className = "json_viewer jsonpath-clear";
  jsonPathClearBtn.style.cssText = "padding: 4px 12px; border: 1px solid #666; background: #f0f0f0; color: #333; border-radius: 3px; font-size: 12px; cursor: pointer;";
  
  var jsonPathToggle = document.createElement("a");
  jsonPathToggle.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z" /></svg>';
  jsonPathToggle.className = "json_viewer icon jsonpath-toggle";
  jsonPathToggle.href = "#";
  jsonPathToggle.title = "Toggle JSON filter";
  
  // Object count display
  var objectCountDisplay = document.createElement("div");
  objectCountDisplay.className = "json_viewer object-count-vertical";
  objectCountDisplay.style.cssText = "display: block; width: 40px; margin-bottom: 5px; padding: 8px 4px; background: rgba(0,0,0,0.1); border-radius: 4px; font-family: monospace; font-size: 10px; line-height: 1.2; text-align: center; color: #333; cursor: pointer;";
  objectCountDisplay.title = "Click to see detailed object count";
  
  var countLines = document.createElement("div");
  countLines.innerHTML = "0<br>0<br>0";
  objectCountDisplay.appendChild(countLines);
  
  objectCountDisplay.addEventListener('click', function(e) {
    e.preventDefault();
    if (!originalJsonData) return;
    var count = countJsonObjects(originalJsonData);
    alert("Objects: " + count.objects + "\\nKeys: " + count.keys + "\\nArrays: " + count.arrays);
  });
  
  // UTF-8 encoding button
  var utf8Button = document.createElement("a");
  utf8Button.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M12.87,15.07L10.33,12.56L10.36,12.53C12.1,10.59 13.34,8.36 14.07,6H17V4H10V2H8V4H1V6H12.17C11.5,7.92 10.44,9.75 9,11.35C8.07,10.32 7.3,9.19 6.69,8H4.69C5.42,9.63 6.42,11.17 7.67,12.56L2.58,17.58L4,19L9,14L12.11,17.11L12.87,15.07M18.5,10H16.5L12,22H14L15.12,19H19.87L21,22H23L18.5,10M15.88,17L17.5,12.67L19.12,17H15.88Z" /></svg>';
  utf8Button.className = "json_viewer icon utf8-button";
  utf8Button.href = "#";
  utf8Button.title = "Force reload with UTF-8 encoding";
  
  utf8Button.addEventListener('click', function(e) {
    e.preventDefault();
    forceUtf8Reload();
  });
  
  function forceUtf8Reload() {
    if (window.location.protocol === 'file:') {
      alert('UTF-8 reload is not available for local files');
      return;
    }
    
    try {
      // Create a new XMLHttpRequest to fetch with UTF-8 encoding
      var xhr = new XMLHttpRequest();
      xhr.open('GET', window.location.href, true);
      xhr.overrideMimeType('application/json; charset=utf-8');
      
      xhr.onreadystatechange = function() {
        if (xhr.readyState === 4 && xhr.status === 200) {
          // Replace the current content with UTF-8 encoded content
          var newContent = xhr.responseText;
          try {
            // Validate that it's still valid JSON
            JSON.parse(newContent);
            
            // Update the page content
            pre.textContent = newContent;
            if (highlighter.editor) {
              highlighter.editor.setValue(newContent);
            }
            
            // Update object count with new data
            originalJsonData = JSON.parse(newContent);
            updateObjectCount();
            
            // Visual feedback
            utf8Button.style.background = "#28a745";
            utf8Button.innerHTML = "UTF-8 ✓";
            setTimeout(function() {
              utf8Button.style.background = "#f0f0f0";
              utf8Button.innerHTML = "UTF-8";
            }, 2000);
            
          } catch (e) {
            console.error('Failed to parse UTF-8 content as JSON:', e);
            alert('Failed to reload as valid JSON with UTF-8 encoding');
          }
        } else if (xhr.readyState === 4) {
          console.error('Failed to reload with UTF-8 encoding:', xhr.status);
          alert('Failed to reload with UTF-8 encoding (HTTP ' + xhr.status + ')');
        }
      };
      
      xhr.send();
    } catch (e) {
      console.error('Error attempting UTF-8 reload:', e);
      alert('Error attempting UTF-8 reload: ' + e.message);
    }
  }
  
  function updateObjectCount() {
    if (!originalJsonData) {
      countLines.innerHTML = "0<br>0<br>0";
      return;
    }
    
    var count = countJsonObjects(originalJsonData);
    countLines.innerHTML = count.objects + "<br>" + count.keys + "<br>" + count.arrays;
    objectCountDisplay.title = "Objects: " + count.objects + ", Keys: " + count.keys + ", Arrays: " + count.arrays + " (click for details)";
  }
  
  function countJsonObjects(data) {
    var objects = 0;
    var keys = 0;
    var arrays = 0;
    
    function traverse(obj) {
      if (obj === null || obj === undefined) return;
      
      if (Array.isArray(obj)) {
        arrays++;
        keys += obj.length;
        obj.forEach(traverse);
      } else if (typeof obj === 'object') {
        objects++;
        var objKeys = Object.keys(obj);
        keys += objKeys.length;
        objKeys.forEach(function(key) {
          traverse(obj[key]);
        });
      }
    }
    
    traverse(data);
    return { objects: objects, keys: keys, arrays: arrays };
  }
  
  // Initially hide the JSONPath container and position it properly
  jsonPathContainer.style.display = "none";
  jsonPathContainer.style.position = "fixed";
  jsonPathContainer.style.top = "60px";
  jsonPathContainer.style.right = "20px";
  jsonPathContainer.style.background = "rgba(255, 255, 255, 0.95)";
  jsonPathContainer.style.border = "1px solid #ccc";
  jsonPathContainer.style.borderRadius = "4px";
  jsonPathContainer.style.padding = "10px";
  jsonPathContainer.style.boxShadow = "0 2px 8px rgba(0,0,0,0.15)";
  jsonPathContainer.style.zIndex = "1000";
  jsonPathContainer.style.minWidth = "300px";
  
  var originalJsonData = null;
  var isFiltered = false;
  
  // Store original JSON data when first loaded
  try {
    originalJsonData = JSON.parse(pre.textContent);
    updateObjectCount();
  } catch (e) {
    console.warn("Could not parse JSON for JSONPath filtering:", e);
  }
  
  jsonPathToggle.addEventListener('click', function(e) {
    e.preventDefault();
    if (jsonPathContainer.style.display === "none") {
      jsonPathContainer.style.display = "flex";
      jsonPathToggle.style.backgroundColor = "#007acc";
    } else {
      jsonPathContainer.style.display = "none";
      jsonPathToggle.style.backgroundColor = "transparent";
    }
  });
  
  function updatePlaceholder() {
    var filterType = filterTypeSelect.value;
    switch(filterType) {
      case 'jsonpath':
        jsonPathInput.placeholder = "e.g., $.users[*].name or $.data.items[0:3]";
        break;
      case 'keys':
        jsonPathInput.placeholder = "e.g., name, email (comma-separated keys to include)";
        break;
      case 'values':
        jsonPathInput.placeholder = "e.g., john, active (comma-separated values to search for)";
        break;
    }
  }
  
  filterTypeSelect.addEventListener('change', updatePlaceholder);
  
  function filterByKeys(data, keys) {
    if (!Array.isArray(keys) || keys.length === 0) return data;
    
    function filterObject(obj) {
      if (typeof obj !== 'object' || obj === null) return obj;
      if (Array.isArray(obj)) return obj.map(filterObject);
      
      var filtered = {};
      keys.forEach(function(key) {
        if (obj.hasOwnProperty(key)) {
          filtered[key] = filterObject(obj[key]);
        }
      });
      return filtered;
    }
    
    return filterObject(data);
  }
  
  function filterByValues(data, values) {
    if (!Array.isArray(values) || values.length === 0) return data;
    
    function containsValue(obj) {
      if (typeof obj === 'string' || typeof obj === 'number') {
        return values.some(function(val) {
          return String(obj).toLowerCase().includes(String(val).toLowerCase());
        });
      }
      if (Array.isArray(obj)) {
        return obj.some(containsValue);
      }
      if (typeof obj === 'object' && obj !== null) {
        return Object.values(obj).some(containsValue);
      }
      return false;
    }
    
    function filterData(obj) {
      if (Array.isArray(obj)) {
        return obj.filter(function(item) {
          return containsValue(item);
        }).map(filterData);
      }
      if (typeof obj === 'object' && obj !== null) {
        var filtered = {};
        Object.keys(obj).forEach(function(key) {
          if (containsValue(obj[key])) {
            filtered[key] = filterData(obj[key]);
          }
        });
        return Object.keys(filtered).length > 0 ? filtered : obj;
      }
      return obj;
    }
    
    return filterData(data);
  }
  
  function applyJsonPathFilter() {
    if (!originalJsonData) return;
    
    var filterType = filterTypeSelect.value;
    var inputValue = jsonPathInput.value.trim();
    if (!inputValue) {
      restoreOriginalJson();
      return;
    }
    
    try {
      var filteredData;
      
      switch(filterType) {
        case 'jsonpath':
          filteredData = jsonpath.query(originalJsonData, inputValue);
          
          // If only one result and it's not an array query, unwrap it
          if (filteredData.length === 1 && !inputValue.includes('[*]') && !inputValue.includes('[?') && !inputValue.includes('..')) {
            filteredData = filteredData[0];
          }
          break;
          
        case 'keys':
          var keys = inputValue.split(',').map(function(key) { return key.trim(); });
          filteredData = filterByKeys(originalJsonData, keys);
          break;
          
        case 'values':
          var values = inputValue.split(',').map(function(val) { return val.trim(); });
          filteredData = filterByValues(originalJsonData, values);
          break;
          
        default:
          filteredData = originalJsonData;
      }
      
      var formattedJson = JSON.stringify(filteredData, null, 2);
      
      // Update the display
      pre.textContent = formattedJson;
      if (highlighter.editor) {
        highlighter.editor.setValue(formattedJson);
      }
      isFiltered = true;
      
      // Update button states
      jsonPathApplyBtn.style.background = "#28a745";
      setTimeout(function() {
        jsonPathApplyBtn.style.background = "#007acc";
      }, 1000);
      
    } catch (e) {
      console.error("Filter error:", e);
      alert("Filter error: " + e.message);
    }
  }
  
  function restoreOriginalJson() {
    if (!originalJsonData) return;
    
    var formattedJson = JSON.stringify(originalJsonData, null, 2);
    pre.textContent = formattedJson;
    if (highlighter.editor) {
      highlighter.editor.setValue(formattedJson);
    }
    isFiltered = false;
    jsonPathInput.value = "";
  }
  
  jsonPathApplyBtn.addEventListener('click', function(e) {
    e.preventDefault();
    applyJsonPathFilter();
  });
  
  jsonPathClearBtn.addEventListener('click', function(e) {
    e.preventDefault();
    restoreOriginalJson();
  });
  
  jsonPathInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      applyJsonPathFilter();
    }
  });
  
  jsonPathContainer.appendChild(jsonPathLabel);
  jsonPathContainer.appendChild(filterTypeSelect);
  jsonPathContainer.appendChild(jsonPathInput);
  jsonPathContainer.appendChild(jsonPathApplyBtn);
  jsonPathContainer.appendChild(jsonPathClearBtn);
  
  extras.appendChild(optionsLink);
  extras.appendChild(copyLink);
  extras.appendChild(rawLink);
  extras.appendChild(jsonPathToggle);
  extras.appendChild(utf8Button);

  // "awaysFold" was a typo but to avoid any problems I'll keep it
  // a while
  pre.setAttribute('data-folded', options.addons.alwaysFold || options.addons.awaysFold)
  extras.appendChild(unfoldLink);
  
  // Add object count at the bottom
  extras.appendChild(objectCountDisplay);

  document.body.appendChild(jsonPathContainer);
  document.body.appendChild(extras);
}

module.exports = renderExtras;
