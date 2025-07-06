# JSON Viewer Extension Testing

This directory contains automated tests for the JSON Viewer Chrome extension using Puppeteer.

## Setup

Install test dependencies:
```bash
npm install
```

Build the extension before testing:
```bash
npm run build
```

## Running Tests

### All tests with Jest:
```bash
npm test
```

### Extension-specific tests:
```bash
npm run test:extension
```

### Run specific test file:
```bash
npx jest tests/extension.test.js
```

### Run tests in headless mode (for CI):
```bash
HEADLESS=true npm test
```

## Test Structure

- **`fixtures/`** - Sample JSON and JSONL files for testing
- **`helpers/`** - Utility classes for browser automation
- **`extension.test.js`** - Main test suite for extension functionality
- **`setup.js`** - Jest configuration and global test setup

## Test Coverage

The tests cover:

### Core Functionality
- ✅ JSON detection and highlighting
- ✅ JSONL format support
- ✅ Local file handling
- ✅ Error handling for invalid JSON

### UI Components
- ✅ Extension toolbar buttons
- ✅ Copy functionality dropdown menu
- ✅ Theme switching
- ✅ Raw/formatted view toggle

### Copy Features
- ✅ Copy as JSON
- ✅ Copy as formatted JSON
- ✅ Copy as compact JSON
- ✅ Copy as CSV (for arrays)
- ✅ Copy as URL parameters

### Error Scenarios
- ✅ Invalid JSON handling
- ✅ Local file access warnings
- ✅ Extension permission checks

## Browser Configuration

The tests launch Chrome with the extension pre-loaded and configured for:
- Local file access
- Extension debugging
- Headless operation (optional)

## Debugging Tests

### View browser during tests:
Set `headless: false` in the ExtensionLoader constructor, or run:
```bash
HEADLESS=false npm run test:extension
```

### Enable console logs:
```bash
DEBUG=true npm test
```

### Test individual components:
```bash
node tests/extension.test.js
```

## CI/CD Integration

For automated testing in CI pipelines:

```yaml
- name: Install dependencies
  run: npm install

- name: Build extension  
  run: npm run build

- name: Run tests
  run: HEADLESS=true npm test
```

## Writing New Tests

### Basic test structure:
```javascript
describe('Feature Name', () => {
  let loader;
  
  beforeEach(async () => {
    loader = new ExtensionLoader();
    await loader.launch();
  });
  
  afterEach(async () => {
    await loader.close();
  });
  
  test('should do something', async () => {
    await loader.loadJsonUrl('https://api.example.com/data.json');
    const result = await loader.isJsonHighlighted();
    expect(result).toBe(true);
  });
});
```

### Available helper methods:
- `loader.loadJsonUrl(url)` - Load JSON from URL
- `loader.loadLocalFile(path)` - Load local JSON file
- `loader.isJsonHighlighted()` - Check if JSON is highlighted
- `loader.clickCopyButton()` - Click the copy button
- `loader.getCopyMenuOptions()` - Get copy menu options
- `loader.testCopyFormat(format)` - Test specific copy format

## Troubleshooting

### Common issues:

1. **Extension not loading**: Ensure `npm run build` was run first
2. **Tests timing out**: Increase timeout in jest.config.js
3. **Local file access**: Some tests require file:// protocol support
4. **Headless mode issues**: Try running with `HEADLESS=false` for debugging

### Chrome permissions:
The extension needs these permissions for testing:
- Access to all URLs
- File system access (for local file tests)
- Clipboard access (for copy functionality tests)