/**
 * WebClaw 独立版 - 浏览器管理器
 * 基于 Playwright 实现浏览器控制
 */

import { chromium, firefox, webkit } from 'playwright';
import { EventEmitter } from 'events';

export class BrowserManager extends EventEmitter {
  constructor(options = {}) {
    super();
    this.browser = null;
    this.context = null;
    this.page = null;
    this.options = {
      browser: options.browser || 'chromium',
      headless: options.headless ?? true,
      viewport: options.viewport || { width: 1280, height: 800 },
      userAgent: options.userAgent,
      timeout: options.timeout || 30000,
      ...options
    };
    this.state = 'idle'; // idle, launching, ready, closed
  }

  /**
   * 启动浏览器
   */
  async launch() {
    if (this.state !== 'idle') {
      console.log(`[BrowserManager] Browser already ${this.state}`);
      return this;
    }

    this.state = 'launching';
    this.emit('launching');

    try {
      const browserType = this.getBrowserType();
      console.log(`[BrowserManager] Launching ${this.options.browser}...`);

      this.browser = await browserType.launch({
        headless: this.options.headless,
        args: [
          '--disable-blink-features=AutomationControlled',
          '--no-sandbox',
          '--disable-setuid-sandbox'
        ]
      });

      this.context = await this.browser.newContext({
        viewport: this.options.viewport,
        userAgent: this.options.userAgent,
        ignoreHTTPSErrors: true
      });

      this.page = await this.context.newPage();
      
      // 设置默认超时
      this.page.setDefaultTimeout(this.options.timeout);

      this.state = 'ready';
      this.emit('ready');
      console.log(`[BrowserManager] Browser ready`);

      // 监听页面事件
      this.setupPageListeners();

      return this;
    } catch (error) {
      this.state = 'idle';
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * 获取浏览器类型
   */
  getBrowserType() {
    switch (this.options.browser) {
      case 'firefox':
        return firefox;
      case 'webkit':
        return webkit;
      case 'chromium':
      default:
        return chromium;
    }
  }

  /**
   * 设置页面事件监听
   */
  setupPageListeners() {
    if (!this.page) return;

    this.page.on('console', msg => {
      this.emit('console', {
        type: msg.type(),
        text: msg.text(),
        location: msg.location()
      });
    });

    this.page.on('pageerror', error => {
      this.emit('pageerror', error);
    });

    this.page.on('crash', () => {
      this.emit('crash');
    });

    this.page.on('framenavigated', frame => {
      this.emit('navigated', {
        url: frame.url(),
        name: frame.name()
      });
    });

    this.page.on('dialog', async dialog => {
      this.emit('dialog', {
        type: dialog.type(),
        message: dialog.message()
      });
      await dialog.accept();
    });
  }

  /**
   * 导航到 URL
   */
  async navigate(url) {
    this.ensureReady();
    console.log(`[BrowserManager] Navigating to: ${url}`);
    
    const response = await this.page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: this.options.timeout
    });

    // 等待页面稳定
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

    return {
      success: true,
      url: this.page.url(),
      title: await this.page.title(),
      status: response?.status(),
      headers: response?.headers()
    };
  }

  /**
   * 执行点击操作
   */
  async click(selector) {
    this.ensureReady();
    await this.page.click(selector, { timeout: 5000 });
    return { success: true, selector };
  }

  /**
   * 点击匹配描述的元素
   */
  async clickByDescription(description) {
    this.ensureReady();
    
    // 尝试查找匹配的元素
    const elements = await this.findElementsByDescription(description);
    
    if (elements.length === 0) {
      throw new Error(`找不到匹配 "${description}" 的元素`);
    }

    const bestMatch = elements[0];
    await bestMatch.element.click();
    
    return {
      success: true,
      description,
      selector: bestMatch.selector
    };
  }

  /**
   * 根据描述查找元素
   */
  async findElementsByDescription(description) {
    this.ensureReady();
    
    const descriptionLower = description.toLowerCase();
    const results = [];

    // 获取所有可点击元素
    const selectors = [
      'a', 'button', 'input[type="submit"]', 'input[type="button"]',
      '[role="button"]', '[onclick]', 'button[type="submit"]'
    ];

    for (const selector of selectors) {
      try {
        const elements = await this.page.$$(selector);
        for (const el of elements) {
          const text = await el.textContent().catch(() => '');
          const ariaLabel = await el.getAttribute('aria-label').catch(() => '');
          const title = await el.getAttribute('title').catch(() => '');
          const combined = `${text} ${ariaLabel} ${title}`.toLowerCase();

          if (combined.includes(descriptionLower) || descriptionLower.includes(combined.trim())) {
            const boundingBox = await el.boundingBox();
            if (boundingBox) {
              results.push({
                element: el,
                selector,
                text: text.trim(),
                score: this.calculateMatchScore(descriptionLower, combined)
              });
            }
          }
        }
      } catch (e) {
        // 忽略选择器错误
      }
    }

    // 按匹配度排序
    results.sort((a, b) => b.score - a.score);
    return results;
  }

  /**
   * 计算匹配分数
   */
  calculateMatchScore(query, target) {
    if (target.includes(query)) return 100;
    const words = query.split(' ');
    const matches = words.filter(w => target.includes(w)).length;
    return (matches / words.length) * 50;
  }

  /**
   * 填写输入框
   */
  async fill(selector, value) {
    this.ensureReady();
    await this.page.fill(selector, value);
    return { success: true, selector, value };
  }

  /**
   * 填写匹配描述的输入框
   */
  async fillByDescription(description, value) {
    this.ensureReady();
    
    const inputs = await this.page.$$('input, textarea, [contenteditable="true"]');
    let matched = null;

    for (const input of inputs) {
      const label = await this.findLabelForInput(input).catch(() => '');
      if (label.toLowerCase().includes(description.toLowerCase())) {
        matched = input;
        break;
      }
    }

    if (!matched) {
      throw new Error(`找不到匹配 "${description}" 的输入框`);
    }

    await matched.fill(value);
    return { success: true, description, value };
  }

  /**
   * 查找输入框对应的标签
   */
  async findLabelForInput(input) {
    const id = await input.getAttribute('id');
    if (id) {
      const label = await this.page.$(`label[for="${id}"]`);
      if (label) return await label.textContent();
    }
    
    const parent = await input.evaluateHandle(el => el.closest('label') || el.previousElementSibling);
    if (parent) return await parent.textContent();
    
    return '';
  }

  /**
   * 滚动页面
   */
  async scroll(direction = 'down', amount = 1) {
    this.ensureReady();
    const scrollAmount = amount * 500;
    
    await this.page.evaluate((scroll) => {
      if (scroll > 0) {
        window.scrollBy({ top: scroll, behavior: 'smooth' });
      } else {
        window.scrollBy({ top: scroll, behavior: 'smooth' });
      }
    }, scrollAmount);

    return { success: true, direction, amount };
  }

  /**
   * 滚动到页面底部
   */
  async scrollToBottom() {
    this.ensureReady();
    await this.page.evaluate(() => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    });
    await this.page.waitForTimeout(500);
    return { success: true };
  }

  /**
   * 滚动到页面顶部
   */
  async scrollToTop() {
    this.ensureReady();
    await this.page.evaluate(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    await this.page.waitForTimeout(500);
    return { success: true };
  }

  /**
   * 截图
   */
  async screenshot(options = {}) {
    this.ensureReady();
    const screenshotOptions = {
      fullPage: options.fullPage ?? false,
      ...options
    };

    const buffer = await this.page.screenshot(screenshotOptions);
    return {
      success: true,
      buffer,
      base64: buffer.toString('base64')
    };
  }

  /**
   * 获取页面分析
   */
  async analyze() {
    this.ensureReady();
    
    const analysis = await this.page.evaluate(() => {
      const getInteractiveElements = () => {
        const elements = [];
        const selectors = 'a, button, input, select, textarea, [role="button"], [onclick]';
        
        document.querySelectorAll(selectors).forEach((el, idx) => {
          const rect = el.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            elements.push({
              tag: el.tagName.toLowerCase(),
              type: el.type || el.getAttribute('role') || '',
              text: el.textContent?.trim().substring(0, 100) || '',
              ariaLabel: el.getAttribute('aria-label') || '',
              href: el.href || '',
              visible: rect.top >= 0 && rect.top < window.innerHeight
            });
          }
        });
        
        return elements;
      };

      return {
        url: window.location.href,
        title: document.title,
        viewport: { width: window.innerWidth, height: window.innerHeight },
        scrollHeight: document.body.scrollHeight,
        interactiveElements: getInteractiveElements()
      };
    });

    return {
      success: true,
      ...analysis
    };
  }

  /**
   * 获取页面内容
   */
  async getContent() {
    this.ensureReady();
    return {
      url: this.page.url(),
      title: await this.page.title(),
      content: await this.page.content()
    };
  }

  /**
   * 执行 JavaScript
   */
  async evaluate(fn, ...args) {
    this.ensureReady();
    return await this.page.evaluate(fn, ...args);
  }

  /**
   * 等待元素出现
   */
  async waitForSelector(selector, options = {}) {
    this.ensureReady();
    await this.page.waitForSelector(selector, {
      timeout: options.timeout || 10000,
      state: options.state || 'visible'
    });
    return { success: true, selector };
  }

  /**
   * 等待导航完成
   */
  async waitForNavigation(options = {}) {
    this.ensureReady();
    await this.page.waitForLoadState('networkidle', { timeout: options.timeout || 30000 });
    return { success: true, url: this.page.url() };
  }

  /**
   * 关闭浏览器
   */
  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.context = null;
      this.page = null;
      this.state = 'idle';
      this.emit('closed');
      console.log(`[BrowserManager] Browser closed`);
    }
  }

  /**
   * 确保浏览器就绪
   */
  ensureReady() {
    if (this.state !== 'ready' || !this.page) {
      throw new Error(`Browser not ready (state: ${this.state})`);
    }
  }

  /**
   * 获取当前状态
   */
  getState() {
    return {
      state: this.state,
      url: this.page?.url() || null,
      title: this.page ? 'ready' : null
    };
  }
}

export default BrowserManager;
