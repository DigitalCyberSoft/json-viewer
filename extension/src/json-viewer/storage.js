var defaults = require('./options/defaults');
var merge = require('./merge');

var OLD_NAMESPACE = "options";
var NAMESPACE = "v2.options";

module.exports = {
  save: function(obj) {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      // Use Chrome storage API (for service workers)
      chrome.storage.local.set({[NAMESPACE]: JSON.stringify(obj)});
    } else if (typeof localStorage !== 'undefined') {
      // Fallback to localStorage (for content scripts)
      localStorage.setItem(NAMESPACE, JSON.stringify(obj));
    }
  },

  loadAsync: function(callback) {
    // Async version for Chrome storage API
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get([NAMESPACE], function(result) {
        var optionsStr = result[NAMESPACE];
        var options = optionsStr ? JSON.parse(optionsStr) : {};
        options.theme = options.theme || defaults.theme;
        options.addons = options.addons ? (typeof options.addons === 'string' ? JSON.parse(options.addons) : options.addons) : {};
        options.addons = merge({}, defaults.addons, options.addons);
        options.structure = options.structure ? (typeof options.structure === 'string' ? JSON.parse(options.structure) : options.structure) : defaults.structure;
        options.style = options.style && options.style.length > 0 ? options.style : defaults.style;
        callback(options);
      });
    } else {
      // Fallback to sync load for localStorage
      callback(this.load());
    }
  },

  load: function() {
    // For service workers, we need to use Chrome storage API
    if (typeof chrome !== 'undefined' && chrome.storage) {
      // Return a default configuration for now in service workers
      // The actual loading will be handled by content scripts
      var options = {};
      options.theme = defaults.theme;
      options.addons = merge({}, defaults.addons);
      options.structure = defaults.structure;
      options.style = defaults.style;
      return options;
    }
    
    // Original localStorage logic for content scripts
    var optionsStr = localStorage.getItem(NAMESPACE);
    optionsStr = this.restoreOldOptions(optionsStr);

    options = optionsStr ? JSON.parse(optionsStr) : {};
    options.theme = options.theme || defaults.theme;
    options.addons = options.addons ? JSON.parse(options.addons) : {};
    options.addons = merge({}, defaults.addons, options.addons)
    options.structure = options.structure ? JSON.parse(options.structure) : defaults.structure;
    options.style = options.style && options.style.length > 0 ? options.style : defaults.style;
    return options;
  },

  restoreOldOptions: function(optionsStr) {
    // Skip this in service worker context
    if (typeof localStorage === 'undefined') {
      return optionsStr;
    }
    
    var oldOptions = localStorage.getItem(OLD_NAMESPACE);
    var options = null;

    if (optionsStr === null && oldOptions !== null) {
      try {
        oldOptions = JSON.parse(oldOptions);
        if(!oldOptions || typeof oldOptions !== "object") oldOptions = {};

        options = {};
        options.theme = oldOptions.theme;
        options.addons = {
          prependHeader: JSON.parse(oldOptions.prependHeader || defaults.addons.prependHeader),
          maxJsonSize: parseInt(oldOptions.maxJsonSize || defaults.addons.maxJsonSize, 10)
        }

        // Update to at least the new max value
        if (options.addons.maxJsonSize < defaults.addons.maxJsonSize) {
          options.addons.maxJsonSize = defaults.addons.maxJsonSize;
        }

        options.addons = JSON.stringify(options.addons);
        options.structure = JSON.stringify(defaults.structure);
        options.style = defaults.style;
        this.save(options);

        optionsStr = JSON.stringify(options);

      } catch(e) {
        console.error('[JSONViewer] error: ' + e.message, e);

      } finally {
        localStorage.removeItem(OLD_NAMESPACE);
      }
    }

    return optionsStr;
  }
}
