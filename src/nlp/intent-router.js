/**
 * WebClaw 独立版 - 意图路由器
 * 将识别到的意图路由到对应的服务
 */

export class IntentRouter {
  constructor(nlpEngine) {
    this.nlpEngine = nlpEngine;
    this.routes = new Map();
    this.initializeRoutes();
  }

  /**
   * 初始化路由规则
   */
  initializeRoutes() {
    // 点击意图
    this.registerRoute('click', async (intent, parsedResult, context) => {
      const browser = context.browser;
      const target = intent.entities?.target || 'body';
      
      try {
        // 尝试按描述查找并点击
        const result = await browser.clickByDescription(target);
        return {
          success: true,
          action: 'click',
          target,
          result
        };
      } catch (e) {
        // 尝试直接点击
        try {
          const result = await browser.click(target);
          return {
            success: true,
            action: 'click',
            target,
            result
          };
        } catch (e2) {
          return {
            success: false,
            action: 'click',
            error: `无法点击 "${target}": ${e2.message}`
          };
        }
      }
    });

    // 填写输入意图
    this.registerRoute('fill', async (intent, parsedResult, context) => {
      const browser = context.browser;
      const target = intent.entities?.target;
      const value = intent.entities?.value;
      
      if (!value) {
        return { success: false, error: '没有指定要填写的值' };
      }

      try {
        const result = target 
          ? await browser.fillByDescription(target, value)
          : await browser.fill('input:not([type="hidden"])', value);
        return {
          success: true,
          action: 'fill',
          target,
          value,
          result
        };
      } catch (e) {
        return {
          success: false,
          action: 'fill',
          error: `无法填写 "${target}": ${e.message}`
        };
      }
    });

    // 滚动意图
    this.registerRoute('scroll', async (intent, parsedResult, context) => {
      const browser = context.browser;
      const direction = intent.entities?.direction || 'down';
      const amount = intent.entities?.amount || 1;

      try {
        let result;
        if (direction === 'top') {
          result = await browser.scrollToTop();
        } else if (direction === 'bottom') {
          result = await browser.scrollToBottom();
        } else {
          result = await browser.scroll(direction, amount);
        }
        return {
          success: true,
          action: 'scroll',
          direction,
          amount,
          result
        };
      } catch (e) {
        return {
          success: false,
          action: 'scroll',
          error: e.message
        };
      }
    });

    // 导航意图
    this.registerRoute('navigate', async (intent, parsedResult, context) => {
      const browser = context.browser;
      let url = intent.entities?.url;

      // 如果没有协议，添加 https://
      if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }

      if (!url) {
        return { success: false, error: '没有指定目标 URL' };
      }

      try {
        const result = await browser.navigate(url);
        return {
          success: true,
          action: 'navigate',
          url,
          result
        };
      } catch (e) {
        return {
          success: false,
          action: 'navigate',
          error: `导航失败: ${e.message}`
        };
      }
    });

    // 搜索意图（使用搜索引擎）
    this.registerRoute('search', async (intent, parsedResult, context) => {
      const browser = context.browser;
      const query = intent.entities?.query;

      if (!query) {
        return { success: false, error: '没有指定搜索词' };
      }

      // 使用 Google 搜索
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
      
      try {
        const result = await browser.navigate(searchUrl);
        return {
          success: true,
          action: 'search',
          query,
          url: searchUrl,
          result
        };
      } catch (e) {
        return {
          success: false,
          action: 'search',
          error: `搜索失败: ${e.message}`
        };
      }
    });

    // 分析页面意图
    this.registerRoute('analyze', async (intent, parsedResult, context) => {
      const browser = context.browser;

      try {
        const result = await browser.analyze();
        return {
          success: true,
          action: 'analyze',
          result
        };
      } catch (e) {
        return {
          success: false,
          action: 'analyze',
          error: e.message
        };
      }
    });

    // 截图意图
    this.registerRoute('screenshot', async (intent, parsedResult, context) => {
      const browser = context.browser;
      const fullPage = intent.entities?.fullPage || false;

      try {
        const result = await browser.screenshot({ fullPage });
        return {
          success: true,
          action: 'screenshot',
          hasImage: true,
          base64Length: result.base64?.length
        };
      } catch (e) {
        return {
          success: false,
          action: 'screenshot',
          error: e.message
        };
      }
    });

    // 通用对话意图
    this.registerRoute('general', async (intent, parsedResult, context) => {
      return {
        success: true,
        type: 'response',
        content: intent.explanation || '我理解了你的请求',
        suggestedAction: intent.suggestedAction
      };
    });
  }

  /**
   * 注册路由
   */
  registerRoute(intent, handler) {
    this.routes.set(intent, handler);
  }

  /**
   * 路由意图
   */
  async route(intent, parsedResult, context) {
    const handler = this.routes.get(intent);
    
    if (!handler) {
      console.log(`[IntentRouter] No handler for intent: ${intent}`);
      return {
        success: false,
        error: `不支持的意图类型: ${intent}`,
        hint: '支持的意图: click, fill, scroll, navigate, search, analyze, screenshot, general'
      };
    }

    try {
      return await handler(intent, parsedResult, context);
    } catch (error) {
      console.error(`[IntentRouter] Handler error:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 获取所有支持的意图
   */
  getSupportedIntents() {
    return Array.from(this.routes.keys());
  }
}

export default IntentRouter;
