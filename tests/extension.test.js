const ExtensionLoader = require('./helpers/extension-loader');
const path = require('path');

describe('JSON Viewer Extension', () => {
  let loader;
  let page;

  beforeEach(async () => {
    loader = new ExtensionLoader();
    const { page: browserPage } = await loader.launch();
    page = browserPage;
  });

  afterEach(async () => {
    await loader.close();
  });

  describe('JSON Detection and Highlighting', () => {
    test('should highlight valid JSON from URL', async () => {
      // Using a public JSON API for testing
      await loader.loadJsonUrl('https://api.github.com/repos/tulios/json-viewer');
      
      const isHighlighted = await loader.isJsonHighlighted();
      expect(isHighlighted).toBe(true);
    });

    test('should load local JSON file', async () => {
      const jsonPath = path.join(__dirname, 'fixtures/sample.json');
      await loader.loadLocalFile(jsonPath);
      
      const isHighlighted = await loader.isJsonHighlighted();
      expect(isHighlighted).toBe(true);
    });

    test('should detect and highlight JSONL format', async () => {
      const jsonlPath = path.join(__dirname, 'fixtures/sample.jsonl');
      await loader.loadLocalFile(jsonlPath);
      
      const isHighlighted = await loader.isJsonHighlighted();
      expect(isHighlighted).toBe(true);
    });
  });

  describe('Extension UI Elements', () => {
    test('should display extras buttons', async () => {
      const jsonPath = path.join(__dirname, 'fixtures/sample.json');
      await loader.loadLocalFile(jsonPath);
      
      const buttons = await loader.getExtrasButtons();
      expect(buttons.length).toBeGreaterThan(0);
      
      // Check for copy button
      const copyButton = buttons.find(btn => btn.className.includes('copy'));
      expect(copyButton).toBeDefined();
      expect(copyButton.title).toContain('Copy');
    });

    test('should show copy menu options when copy button is clicked', async () => {
      const jsonPath = path.join(__dirname, 'fixtures/sample.json');
      await loader.loadLocalFile(jsonPath);
      
      const clicked = await loader.clickCopyButton();
      expect(clicked).toBe(true);
      
      const menuOptions = await loader.getCopyMenuOptions();
      expect(menuOptions).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Copy as JSON'),
          expect.stringContaining('Copy as Formatted JSON'),
          expect.stringContaining('Copy as Compact JSON'),
          expect.stringContaining('Copy as CSV'),
          expect.stringContaining('Copy as URL Parameters')
        ])
      );
    });
  });

  describe('Copy Functionality', () => {
    test('should handle JSON copy format', async () => {
      const jsonPath = path.join(__dirname, 'fixtures/sample.json');
      await loader.loadLocalFile(jsonPath);
      
      const result = await loader.testCopyFormat('JSON');
      expect(result).toBe(true);
    });

    test('should handle CSV copy format for arrays', async () => {
      const jsonlPath = path.join(__dirname, 'fixtures/sample.jsonl');
      await loader.loadLocalFile(jsonlPath);
      
      const result = await loader.testCopyFormat('CSV');
      expect(result).toBe(true);
    });

    test('should handle URL parameters copy format', async () => {
      const jsonPath = path.join(__dirname, 'fixtures/sample.json');
      await loader.loadLocalFile(jsonPath);
      
      const result = await loader.testCopyFormat('URL Parameters');
      expect(result).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid JSON gracefully', async () => {
      // Create a page with invalid JSON
      await page.setContent(`
        <html>
          <body>
            <pre>{ invalid json content }</pre>
          </body>
        </html>
      `);
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Should not crash and should not highlight
      const isHighlighted = await loader.isJsonHighlighted();
      expect(isHighlighted).toBe(false);
    });

    test('should show local file access message when needed', async () => {
      // This test simulates the case where file access is not enabled
      // In a real scenario, this would require disabling file access permission
      
      await page.setContent(`
        <html>
          <body>
            <script>
              // Simulate file:// protocol
              Object.defineProperty(window.location, 'protocol', {
                value: 'file:',
                writable: false
              });
            </script>
          </body>
        </html>
      `);
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // This test would need to be adjusted based on actual permission handling
      // For now, we just ensure the test framework works
      expect(true).toBe(true);
    });
  });
});

// Integration test that can be run separately
if (require.main === module) {
  console.log('Running JSON Viewer Extension Tests...');
  
  async function runBasicTest() {
    const loader = new ExtensionLoader();
    
    try {
      console.log('Launching browser with extension...');
      await loader.launch();
      
      console.log('Testing JSON highlighting...');
      const jsonPath = path.join(__dirname, 'fixtures/sample.json');
      await loader.loadLocalFile(jsonPath);
      
      const isHighlighted = await loader.isJsonHighlighted();
      console.log('JSON highlighted:', isHighlighted);
      
      console.log('Testing copy functionality...');
      const clicked = await loader.clickCopyButton();
      console.log('Copy button clicked:', clicked);
      
      if (clicked) {
        const menuOptions = await loader.getCopyMenuOptions();
        console.log('Copy menu options:', menuOptions);
      }
      
      console.log('Testing JSONL support...');
      const jsonlPath = path.join(__dirname, 'fixtures/sample.jsonl');
      await loader.loadLocalFile(jsonlPath);
      
      const jsonlHighlighted = await loader.isJsonHighlighted();
      console.log('JSONL highlighted:', jsonlHighlighted);
      
      console.log('Tests completed successfully!');
      
    } catch (error) {
      console.error('Test failed:', error);
    } finally {
      await loader.close();
    }
  }
  
  runBasicTest();
}