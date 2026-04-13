/**
 * WebClaw 独立版 - 服务注册表
 * 管理所有内置服务和扩展服务
 */

import { EventEmitter } from 'events';

export class ServiceRegistry {
  constructor() {
    this.services = new Map();
    this.emitter = new EventEmitter();
  }

  /**
   * 初始化服务
   */
  async initialize() {
    // 注册所有内置服务
    this.registerService('click', new ClickService());
    this.registerService('fill', new FillService());
    this.registerService('scroll', new ScrollService());
    this.registerService('navigate', new NavigateService());
    this.registerService('search', new SearchService());
    this.registerService('analyze', new AnalyzeService());
    this.registerService('screenshot', new ScreenshotService());
    this.registerService('wait', new WaitService());

    console.log('[ServiceRegistry] Initialized with', this.services.size, 'services');
  }

  /**
   * 注册服务
   */
  registerService(name, service) {
    this.services.set(name, service);
    this.emitter.emit('registered', { name, service });
  }

  /**
   * 获取服务
   */
  getService(name) {
    return this.services.get(name);
  }

  /**
   * 获取所有服务
   */
  getAllServices() {
    return Array.from(this.services.keys());
  }

  /**
   * 检查服务是否存在
   */
  hasService(name) {
    return this.services.has(name);
  }

  /**
   * 执行服务
   */
  async execute(serviceName, params, context) {
    const service = this.getService(serviceName);
    if (!service) {
      throw new Error(`Service not found: ${serviceName}`);
    }
    return await service.execute(params, context);
  }
}

/**
 * 点击服务
 */
class ClickService {
  async execute(params, context) {
    const { target } = params;
    const browser = context.browser;

    try {
      const result = await browser.clickByDescription(target);
      return { success: true, action: 'click', target, result };
    } catch (e) {
      // 尝试直接点击
      try {
        const result = await browser.click(target);
        return { success: true, action: 'click', target, result };
      } catch (e2) {
        return { success: false, error: `无法点击 "${target}": ${e2.message}` };
      }
    }
  }
}

/**
 * 填写服务
 */
class FillService {
  async execute(params, context) {
    const { target, value } = params;
    const browser = context.browser;

    if (!value) {
      return { success: false, error: '没有指定要填写的值' };
    }

    try {
      const result = target
        ? await browser.fillByDescription(target, value)
        : await browser.fill('input:not([type="hidden"])', value);
      return { success: true, action: 'fill', target, value, result };
    } catch (e) {
      return { success: false, error: `无法填写 "${target}": ${e.message}` };
    }
  }
}

/**
 * 滚动服务
 */
class ScrollService {
  async execute(params, context) {
    const { direction, amount } = params;
    const browser = context.browser;

    try {
      let result;
      if (direction === 'top') {
        result = await browser.scrollToTop();
      } else if (direction === 'bottom') {
        result = await browser.scrollToBottom();
      } else {
        result = await browser.scroll(direction, amount || 1);
      }
      return { success: true, action: 'scroll', direction, amount, result };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }
}

/**
 * 导航服务
 */
class NavigateService {
  async execute(params, context) {
    const { url } = params;
    const browser = context.browser;

    if (!url) {
      return { success: false, error: '没有指定目标 URL' };
    }

    let targetUrl = url;
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'https://' + targetUrl;
    }

    try {
      const result = await browser.navigate(targetUrl);
      return { success: true, action: 'navigate', url: targetUrl, result };
    } catch (e) {
      return { success: false, error: `导航失败: ${e.message}` };
    }
  }
}

/**
 * 搜索服务
 */
class SearchService {
  async execute(params, context) {
    const { query } = params;
    const browser = context.browser;

    if (!query) {
      return { success: false, error: '没有指定搜索词' };
    }

    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;

    try {
      const result = await browser.navigate(searchUrl);
      return { success: true, action: 'search', query, url: searchUrl, result };
    } catch (e) {
      return { success: false, error: `搜索失败: ${e.message}` };
    }
  }
}

/**
 * 页面分析服务
 */
class AnalyzeService {
  async execute(params, context) {
    const browser = context.browser;

    try {
      const result = await browser.analyze();
      return { success: true, action: 'analyze', result };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }
}

/**
 * 截图服务
 */
class ScreenshotService {
  async execute(params, context) {
    const { fullPage } = params;
    const browser = context.browser;

    try {
      const result = await browser.screenshot({ fullPage: fullPage ?? false });
      return { success: true, action: 'screenshot', hasImage: true, ...result };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }
}

/**
 * 等待服务
 */
class WaitService {
  async execute(params, context) {
    const { seconds } = params;
    const waitTime = (seconds || 1) * 1000;

    await new Promise(resolve => setTimeout(resolve, waitTime));
    return { success: true, action: 'wait', duration: waitTime };
  }
}

export default ServiceRegistry;
