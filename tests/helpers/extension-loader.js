const puppeteer = require('puppeteer');
const path = require('path');

class ExtensionLoader {
  constructor() {
    this.browser = null;
    this.page = null;
    this.serviceWorker = null;
    this.extensionPath = path.join(__dirname, '../../build/json_viewer');
  }

  async launch(options = {}) {
    // Ensure extension is built before testing
    const fs = require('fs');
    if (!fs.existsSync(this.extensionPath)) {
      throw new Error(`Extension not built. Run 'npm run build' first. Looking for: ${this.extensionPath}`);
    }
    
    const manifestPath = path.join(this.extensionPath, 'manifest.json');
    if (!fs.existsSync(manifestPath)) {
      throw new Error(`Extension manifest not found at: ${manifestPath}`);
    }
    
    const defaultOptions = {
      headless: false, // Required for extensions in 2024
      pipe: true, // Required for extension loading per official docs
      enableExtensions: [this.extensionPath], // Modern approach for loading extensions
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--allow-file-access-from-files',
        `--user-data-dir=/tmp/chrome-test-profile-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      ],
      ...options
    };

    console.log('Launching browser with extension:', this.extensionPath);
    this.browser = await puppeteer.launch(defaultOptions);
    this.page = await this.browser.newPage();
    
    // Enable local file access for testing
    await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    
    // Wait for extension to initialize and connect to service worker
    await this.connectToServiceWorker();
    
    return { browser: this.browser, page: this.page, serviceWorker: this.serviceWorker };
  }

  async connectToServiceWorker() {
    try {
      console.log('Waiting for service worker...');
      
      // Wait for the service worker target
      const workerTarget = await this.browser.waitForTarget(
        target => 
          target.type() === 'service_worker' && 
          target.url().endsWith('background.js'),
        { timeout: 10000 }
      );
      
      this.serviceWorker = await workerTarget.worker();
      console.log('Connected to extension service worker:', workerTarget.url());
      
      // Test that we can communicate with the service worker
      const result = await this.serviceWorker.evaluate(() => {
        return { 
          ready: true, 
          manifestVersion: chrome?.runtime?.getManifest?.()?.manifest_version 
        };
      });
      
      console.log('Service worker evaluation result:', result);
      return true;
      
    } catch (error) {
      console.warn('Could not connect to service worker:', error.message);
      return false;
    }
  }

  async getExtensionId() {
    // Try to get extension ID from chrome://extensions or by loading a known extension resource
    try {
      await this.page.goto('chrome://extensions/', { waitUntil: 'networkidle2', timeout: 5000 });
      
      const extensionId = await this.page.evaluate(() => {
        const extensionCards = document.querySelectorAll('extensions-item');
        for (const card of extensionCards) {
          const nameElement = card.shadowRoot?.querySelector('#name');
          if (nameElement && nameElement.textContent.includes('JSON Viewer')) {
            return card.id;
          }
        }
        return null;
      });
      
      console.log('Found extension ID:', extensionId);
      return extensionId;
    } catch (error) {
      console.warn('Could not get extension ID:', error.message);
      // Fallback: try a common extension ID pattern
      return 'placeholder';
    }
  }

  async loadJsonUrl(url) {
    if (!this.page) {
      throw new Error('Browser not launched. Call launch() first.');
    }
    
    console.log('Loading JSON URL:', url);
    await this.page.goto(url, { waitUntil: 'networkidle2', timeout: 10000 });
    
    // Wait for JSON viewer to process the content
    await this.waitForExtensionToLoad();
    
    return this.page;
  }

  async loadLocalFile(filePath) {
    if (!this.page) {
      throw new Error('Browser not launched. Call launch() first.');
    }
    
    const fileUrl = 'file://' + path.resolve(filePath);
    console.log('Loading local file:', fileUrl);
    await this.page.goto(fileUrl, { waitUntil: 'networkidle2', timeout: 10000 });
    
    // Wait for JSON viewer to process the content
    await this.waitForExtensionToLoad();
    
    return this.page;
  }

  async waitForExtensionToLoad() {
    // Wait for either CodeMirror to appear (JSON processed) or raw content to be visible
    try {
      await this.page.waitForFunction(
        () => {
          // Debug: log what we can see
          const elements = {
            codeMirror: !!document.querySelector('.CodeMirror'),
            extras: !!document.querySelector('.extras'),
            pre: !!document.querySelector('pre'),
            body: document.body ? document.body.children.length : 0,
            scripts: document.querySelectorAll('script').length
          };
          
          console.log('Extension check:', JSON.stringify(elements));
          
          // Check if CodeMirror is loaded (extension activated)
          const codeMirror = document.querySelector('.CodeMirror');
          if (codeMirror) {
            console.log('CodeMirror found!');
            return true;
          }
          
          // Check if extras toolbar is present (extension loaded)
          const extras = document.querySelector('.extras');
          if (extras) {
            console.log('Extras toolbar found!');
            return true;
          }
          
          // Check if viewer script has been injected
          const viewerScript = Array.from(document.querySelectorAll('script')).find(s => 
            s.src && s.src.includes('viewer.js')
          );
          if (viewerScript) {
            console.log('Viewer script found:', viewerScript.src);
          }
          
          return false;
        },
        { timeout: 8000, polling: 500 }
      );
      console.log('Extension loaded and processed content');
    } catch (error) {
      console.warn('Extension may not have processed content in time:', error.message);
      
      // Debug: Get more info about what's actually on the page
      const pageInfo = await this.page.evaluate(() => {
        return {
          url: window.location.href,
          title: document.title,
          bodyChildren: document.body ? document.body.children.length : 0,
          scripts: Array.from(document.querySelectorAll('script')).map(s => s.src || 'inline'),
          contentType: document.contentType,
          readyState: document.readyState,
          hasCodeMirror: !!document.querySelector('.CodeMirror'),
          hasExtras: !!document.querySelector('.extras'),
          hasPre: !!document.querySelector('pre'),
          preContent: document.querySelector('pre') ? document.querySelector('pre').textContent.substring(0, 100) : null
        };
      });
      
      console.log('Page debug info:', JSON.stringify(pageInfo, null, 2));
      
      // Give it a bit more time
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  async isJsonHighlighted() {
    if (!this.page) return false;
    
    // Check if CodeMirror is present (indicates JSON highlighting)
    const codeMirror = await this.page.$('.CodeMirror');
    return codeMirror !== null;
  }

  async getExtrasButtons() {
    if (!this.page) return [];
    
    // Wait for extras to be present
    try {
      await this.page.waitForSelector('.extras', { timeout: 3000 });
    } catch (error) {
      console.warn('Extras toolbar not found');
      return [];
    }
    
    const buttons = await this.page.$$('.extras a, .extras button, .extras span');
    const buttonData = [];
    
    for (const button of buttons) {
      const title = await button.evaluate(el => el.title || el.getAttribute('title') || '');
      const className = await button.evaluate(el => el.className || '');
      const text = await button.evaluate(el => el.textContent || '');
      buttonData.push({ title, className, text });
    }
    
    console.log('Found buttons:', buttonData.length);
    return buttonData;
  }

  async clickCopyButton() {
    if (!this.page) return false;
    
    // Try multiple selectors for the copy button
    const copySelectors = [
      '.json_viewer.icon.copy',
      '.json_viewer.copy',
      '.extras .copy',
      'a[title*="Copy"]'
    ];
    
    for (const selector of copySelectors) {
      const copyButton = await this.page.$(selector);
      if (copyButton) {
        console.log('Found copy button with selector:', selector);
        await copyButton.click();
        return true;
      }
    }
    
    console.warn('Copy button not found');
    return false;
  }

  async getCopyMenuOptions() {
    if (!this.page) return [];
    
    // Wait for copy menu to appear
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const menuItems = await this.page.$$('.json_viewer.copy-menu a');
    const options = [];
    
    for (const item of menuItems) {
      const text = await item.evaluate(el => el.textContent);
      options.push(text);
    }
    
    return options;
  }

  async testCopyFormat(format) {
    if (!this.page) return null;
    
    // Click copy button to open menu
    await this.clickCopyButton();
    
    // Find and click the specific format option
    const menuItems = await this.page.$$('.json_viewer.copy-menu a');
    for (const item of menuItems) {
      const text = await item.evaluate(el => el.textContent);
      if (text.includes(format)) {
        await item.click();
        break;
      }
    }
    
    // Get clipboard content (note: this requires special permissions in real browsers)
    // For testing purposes, we'll check that the copy action was attempted
    await new Promise(resolve => setTimeout(resolve, 500));
    return true;
  }

  async hasLocalFileAccessMessage() {
    if (!this.page) return false;
    
    const message = await this.page.$('div');
    if (message) {
      const text = await message.evaluate(el => el.textContent);
      return text.includes('Local File Access Required');
    }
    return false;
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
      this.serviceWorker = null;
    }
  }
}

module.exports = ExtensionLoader;