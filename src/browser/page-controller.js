/**
 * WebClaw 独立版 - 页面控制器
 * 提供更高级的页面交互功能
 */

export class PageController {
  constructor(browser) {
    this.browser = browser;
  }

  /**
   * 查找并返回匹配描述的元素
   */
  async findElement(description) {
    const analysis = await this.browser.analyze();
    const descLower = description.toLowerCase();
    
    const candidates = analysis.interactiveElements.filter(el => {
      const text = (el.text || '').toLowerCase();
      const label = (el.ariaLabel || '').toLowerCase();
      return text.includes(descLower) || label.includes(descLower) || descLower.includes(text);
    });

    if (candidates.length === 0) {
      throw new Error(`找不到匹配 "${description}" 的元素`);
    }

    return candidates[0];
  }

  /**
   * 查找所有匹配的元素
   */
  async findElements(description) {
    const analysis = await this.browser.analyze();
    const descLower = description.toLowerCase();
    
    return analysis.interactiveElements.filter(el => {
      const text = (el.text || '').toLowerCase();
      const label = (el.ariaLabel || '').toLowerCase();
      return text.includes(descLower) || label.includes(descLower);
    });
  }

  /**
   * 等待页面加载完成
   */
  async waitForLoad(timeout = 30000) {
    await this.browser.page.waitForLoadState('networkidle', { timeout });
    return { success: true };
  }

  /**
   * 等待元素出现
   */
  async waitForElement(selector, options = {}) {
    await this.browser.page.waitForSelector(selector, {
      timeout: options.timeout || 10000,
      state: options.state || 'visible'
    });
    return { success: true, selector };
  }

  /**
   * 执行 JavaScript 代码
   */
  async evaluate(fn, ...args) {
    return await this.browser.page.evaluate(fn, ...args);
  }

  /**
   * 获取元素文本
   */
  async getText(selector) {
    const text = await this.browser.page.textContent(selector);
    return text?.trim();
  }

  /**
   * 获取元素属性
   */
  async getAttribute(selector, attribute) {
    return await this.browser.page.getAttribute(selector, attribute);
  }

  /**
   * 悬停到元素
   */
  async hover(selector) {
    await this.browser.page.hover(selector);
    return { success: true };
  }

  /**
   * 双击元素
   */
  async doubleClick(selector) {
    await this.browser.page.dblclick(selector);
    return { success: true };
  }

  /**
   * 按键操作
   */
  async press(key, options = {}) {
    await this.browser.page.keyboard.press(key, options);
    return { success: true };
  }

  /**
   * 输入文本（不替换现有内容）
   */
  async type(text, options = {}) {
    const delay = options.delay || 0;
    await this.browser.page.keyboard.type(text, { delay });
    return { success: true };
  }

  /**
   * 清空输入框并输入
   */
  async clearAndType(selector, text) {
    await this.browser.page.locator(selector).clear();
    await this.browser.page.locator(selector).fill(text);
    return { success: true };
  }

  /**
   * 选择下拉选项
   */
  async selectOption(selector, value) {
    await this.browser.page.selectOption(selector, value);
    return { success: true };
  }

  /**
   * 勾选/取消勾选复选框
   */
  async check(selector, checked = true) {
    if (checked) {
      await this.browser.page.check(selector);
    } else {
      await this.browser.page.uncheck(selector);
    }
    return { success: true };
  }

  /**
   * 获取页面标题
   */
  async getTitle() {
    return await this.browser.page.title();
  }

  /**
   * 获取当前 URL
   */
  async getUrl() {
    return this.browser.page.url();
  }

  /**
   * 获取 cookies
   */
  async getCookies() {
    return await this.browser.context.cookies();
  }

  /**
   * 设置 cookies
   */
  async setCookies(cookies) {
    await this.browser.context.addCookies(cookies);
    return { success: true };
  }

  /**
   * 添加本地存储
   */
  async setLocalStorage(data) {
    await this.browser.page.evaluate((items) => {
      for (const [key, value] of Object.entries(items)) {
        localStorage.setItem(key, value);
      }
    }, data);
    return { success: true };
  }

  /**
   * 获取本地存储
   */
  async getLocalStorage(keys) {
    return await this.browser.page.evaluate((ks) => {
      const result = {};
      for (const key of ks) {
        result[key] = localStorage.getItem(key);
      }
      return result;
    }, keys);
  }

  /**
   * 刷新页面
   */
  async reload() {
    await this.browser.page.reload();
    return { success: true };
  }

  /**
   * 后退
   */
  async goBack() {
    await this.browser.page.goBack();
    return { success: true };
  }

  /**
   * 前进
   */
  async goForward() {
    await this.browser.page.goForward();
    return { success: true };
  }

  /**
   * 聚焦元素
   */
  async focus(selector) {
    await this.browser.page.focus(selector);
    return { success: true };
  }

  /**
   * 拖拽元素
   */
  async dragAndDrop(fromSelector, toSelector) {
    const fromBox = await this.browser.page.locator(fromSelector).boundingBox();
    const toBox = await this.browser.page.locator(toSelector).boundingBox();
    
    await this.browser.page.mouse.move(fromBox.x + fromBox.width / 2, fromBox.y + fromBox.height / 2);
    await this.browser.page.mouse.down();
    await this.browser.page.mouse.move(toBox.x + toBox.width / 2, toBox.y + toBox.height / 2);
    await this.browser.page.mouse.up();
    
    return { success: true };
  }

  /**
   * 截取元素截图
   */
  async screenshotElement(selector, path) {
    const element = this.browser.page.locator(selector);
    const buffer = await element.screenshot();
    
    if (path) {
      const { writeFileSync } = await import('fs');
      writeFileSync(path, buffer);
    }
    
    return { success: true, buffer };
  }

  /**
   * 滚动到元素
   */
  async scrollIntoView(selector) {
    await this.browser.page.locator(selector).scrollIntoViewIfNeeded();
    return { success: true };
  }

  /**
   * 获取元素边界框
   */
  async getBoundingBox(selector) {
    return await this.browser.page.locator(selector).boundingBox();
  }

  /**
   * 检查元素是否可见
   */
  async isVisible(selector) {
    return await this.browser.page.locator(selector).isVisible();
  }

  /**
   * 检查元素是否存在
   */
  async isAttached(selector) {
    return await this.browser.page.locator(selector).isAttached();
  }
}

export default PageController;
