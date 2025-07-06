var jsonFormater = require('../jsl-format');
var loadCss = require('../load-css');
var themeDarkness = require('../theme-darkness');

var themeDefault = "default";
var themesList = process.env.THEMES;
var themeJSONExample = {
  title: "JSON Example",
  nested: {
    someInteger: 7,
    someBoolean: true,
    someArray: [
      "list of",
      "fake strings",
      "and fake keys"
    ]
  }
}

function onThemeChange(input, editor) {
  var selectedTheme = input.options[input.selectedIndex].value;
  // Split '_' to allow themes with variations (e.g: solarized dark; solarized light)
  var themeOption = selectedTheme.replace(/_/, ' ');

  var currentLinkTag = document.getElementById('selected-theme');
  if (currentLinkTag !== null) {
    document.head.removeChild(currentLinkTag);
  }

  // Handle auto theme by resolving to appropriate theme
  var resolvedTheme = selectedTheme;
  if (selectedTheme === "auto") {
    if (typeof window !== 'undefined' && window.matchMedia) {
      var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      resolvedTheme = prefersDark ? 'cobalt' : 'default';
    } else {
      resolvedTheme = 'default';
    }
  }

  if (resolvedTheme === "default") {
    editor.setOption("theme", themeOption);

  } else {
    var themeToLoad = {
      id: "selected-theme",
      path: "themes/" + themeDarkness(resolvedTheme) + "/" + resolvedTheme + ".css",
      checkClass: "theme-" + resolvedTheme + "-css-check"
    };
    
    loadCss(themeToLoad).then(function() {
      // For auto theme, use the resolved theme for the editor
      var editorTheme = selectedTheme === "auto" ? resolvedTheme : themeOption;
      editor.setOption("theme", editorTheme);
    });
  }
}

function renderThemeList(CodeMirror, value) {
  var themesInput = document.getElementById('themes');
  var themesExampleInput = document.getElementById('themes-example');
  themesExampleInput.innerHTML = jsonFormater(JSON.stringify(themeJSONExample));

  var themeEditor = CodeMirror.fromTextArea(themesExampleInput, {
    readOnly: true,
    mode: "application/ld+json",
    lineWrapping: true,
    lineNumbers: true,
    tabSize: 2,
    foldGutter: true,
    gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"]
  });

  themesInput.onchange = function() {
    onThemeChange(themesInput, themeEditor);
  }

  var optionSelected = value;
  themesInput.appendChild(createOption("auto", optionSelected));
  themesInput.appendChild(createOption(themeDefault, optionSelected));
  themesInput.appendChild(createThemeGroup("Light", themesList.light, optionSelected));
  themesInput.appendChild(createThemeGroup("Dark", themesList.dark, optionSelected));

  if (optionSelected && optionSelected !== "default") {
    onThemeChange(themesInput, themeEditor);
  }
}

function createOption(theme, optionSelected) {
  var option = document.createElement("option");
  option.value = theme
  option.text = theme;

  if (theme === optionSelected) {
    option.selected = "selected";
  }

  return option;
}

function createGroup(label) {
  var group = document.createElement("optgroup");
  group.label = label;
  return group;
}

function createThemeGroup(name, list, optionSelected) {
  var group = createGroup(name);
  list.forEach(function(theme) {
    group.appendChild(createOption(theme, optionSelected));
  });
  return group;
}

module.exports = renderThemeList;
