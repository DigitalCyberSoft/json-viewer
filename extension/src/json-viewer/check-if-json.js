var extractJSON = require('./extract-json');
var bodyModified = false;

function allTextNodes(nodes) {
  return !Object.keys(nodes).some(function(key) {
    return nodes[key].nodeName !== '#text'
  })
}

function getPreWithSource() {
  var childNodes = document.body.childNodes;

  if (childNodes.length === 0) {
    return null
  }

  if (childNodes.length > 1 && allTextNodes(childNodes)) {
    if (process.env.NODE_ENV === 'development') {
      console.debug("[JSONViewer] Loaded from a multiple text nodes, normalizing");
    }

    document.body.normalize() // concatenates adjacent text nodes
  }

  var childNode = childNodes[0];
  var nodeName = childNode.nodeName
  var textContent = childNode.textContent

  if (nodeName === "PRE") {
    return childNode;
  }

  // if Content-Type is text/html
  if (nodeName === "#text" && textContent.trim().length > 0) {
    if (process.env.NODE_ENV === 'development') {
      console.debug("[JSONViewer] Loaded from a text node, this might have returned content-type: text/html");
    }

    var pre = document.createElement("pre");
    pre.textContent = textContent;
    document.body.removeChild(childNode);
    document.body.appendChild(pre);
    bodyModified = true;
    return pre;
  }

  return null
}

function restoreNonJSONBody() {
  var artificialPre = document.body.lastChild;
  var removedChildNode = document.createElement("text");
  removedChildNode.textContent = artificialPre.textContent;
  document.body.insertBefore(removedChildNode, document.body.firstChild);
  document.body.removeChild(artificialPre);
}

function isJSON(jsonStr) {
  var str = jsonStr;
  if (!str || str.length === 0) {
    return false
  }

  // Performance optimization: quick check for JSON start/end characters
  var trimmed = str.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
    return false;
  }
  if (!trimmed.endsWith('}') && !trimmed.endsWith(']')) {
    return false;
  }

  // Fast path for simple validation
  try {
    JSON.parse(str);
    return true;
  } catch (e) {
    // Fall back to regex-based validation for edge cases
    str = str.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, '@')
    str = str.replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']')
    str = str.replace(/(?:^|:|,)(?:\s*\[)+/g, '')
    return (/^[\],:{}\s]*$/).test(str)
  }
}

function isJSONP(jsonStr) {
  return isJSON(extractJSON(jsonStr));
}

function isJSONL(text) {
  if (!text || text.trim().length === 0) {
    return false;
  }

  var lines = text.trim().split('\n');
  
  // JSONL must have at least one line
  if (lines.length === 0) {
    return false;
  }

  // Check if each non-empty line is valid JSON
  var hasValidJSON = false;
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if (line.length === 0) {
      continue; // Skip empty lines
    }
    
    try {
      JSON.parse(line);
      hasValidJSON = true;
    } catch (e) {
      return false;
    }
  }
  
  return hasValidJSON;
}

function checkIfJson(sucessCallback, element) {
  // Performance optimization: check content-type first
  var contentType = document.contentType || '';
  var isLikelyJson = contentType.includes('json') || 
                    contentType.includes('application/json') ||
                    contentType.includes('text/json') ||
                    window.location.pathname.endsWith('.json') ||
                    window.location.pathname.endsWith('.jsonl');
  
  // If content-type doesn't suggest JSON and URL doesn't end with .json/.jsonl, 
  // do a quick content check first
  if (!isLikelyJson) {
    var bodyText = document.body.textContent || '';
    var trimmed = bodyText.trim();
    if (trimmed.length > 0 && 
        !trimmed.startsWith('{') && 
        !trimmed.startsWith('[') &&
        !trimmed.includes('(')) { // JSONP check
      return; // Early exit for obviously non-JSON content
    }
  }

  var pre = element || getPreWithSource();

  if (pre !== null &&
    pre !== undefined &&
    (isJSON(pre.textContent) || isJSONP(pre.textContent) || isJSONL(pre.textContent))) {

    sucessCallback(pre);
  } else if (bodyModified) {
    restoreNonJSONBody();
  }
}

module.exports = {
  checkIfJson: checkIfJson,
  isJSON: isJSON,
  isJSONL: isJSONL
};
