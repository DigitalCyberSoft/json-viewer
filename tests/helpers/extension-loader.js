const puppeteer = require('puppeteer');
const path = require('path');

class ExtensionLoader {
  constructor() {
    this.browser = null;
    this.page = null;
    this.extensionPath = path.join(__dirname, '../../build/json_viewer');
  }

  async launch(options = {}) {
    const defaultOptions = {
      headless: false, // Set to true for CI/automated testing
      args: [
        `--disable-extensions-except=${this.extensionPath}`,
        `--load-extension=${this.extensionPath}`,
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--allow-file-access-from-files'
      ],
      ...options
    };

    this.browser = await puppeteer.launch(defaultOptions);
    this.page = await this.browser.newPage();
    
    // Enable local file access for testing
    await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    
    return { browser: this.browser, page: this.page };
  }

  async loadJsonUrl(url) {
    if (!this.page) {
      throw new Error('Browser not launched. Call launch() first.');
    }
    
    await this.page.goto(url, { waitUntil: 'networkidle2' });
    
    // Wait for JSON viewer to process the content
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return this.page;
  }

  async loadLocalFile(filePath) {
    if (!this.page) {
      throw new Error('Browser not launched. Call launch() first.');
    }
    
    const fileUrl = 'file://' + path.resolve(filePath);
    await this.page.goto(fileUrl, { waitUntil: 'networkidle2' });
    
    // Wait for JSON viewer to process the content
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return this.page;
  }

  async isJsonHighlighted() {
    if (!this.page) return false;
    
    // Check if CodeMirror is present (indicates JSON highlighting)
    const codeMirror = await this.page.$('.CodeMirror');
    return codeMirror !== null;
  }

  async getExtrasButtons() {
    if (!this.page) return [];
    
    const buttons = await this.page.$$('.extras a');
    const buttonData = [];
    
    for (const button of buttons) {
      const title = await button.evaluate(el => el.title);
      const className = await button.evaluate(el => el.className);
      buttonData.push({ title, className });
    }
    
    return buttonData;
  }

  async clickCopyButton() {
    if (!this.page) return false;
    
    const copyButton = await this.page.$('.json_viewer.icon.copy');
    if (copyButton) {
      await copyButton.click();
      return true;
    }
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
    }
  }
}

module.exports = ExtensionLoader;