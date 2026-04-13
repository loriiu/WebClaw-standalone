/**
 * WebClaw 独立版 - Agent 核心控制器
 * 协调浏览器、NLP 引擎和任务执行
 */

import { BrowserManager } from '../browser/browser-manager.js';
import { NLPEngine } from '../nlp/nlp-engine.js';
import { TaskExecutor } from './task-executor.js';
import { ServiceRegistry } from '../services/registry.js';
import { EventEmitter } from 'events';

export class Agent extends EventEmitter {
  constructor(options = {}) {
    super();
    this.options = options;
    
    // 初始化组件
    this.browser = new BrowserManager({
      browser: options.browser || 'chromium',
      headless: options.headless ?? false,
      ...options
    });
    
    this.nlp = new NLPEngine({
      apiToken: options.apiToken,
      endpoint: options.endpoint,
      model: options.model
    });
    
    this.services = new ServiceRegistry();
    this.executor = new TaskExecutor(this);
    
    // 状态
    this.state = 'idle'; // idle, initializing, ready, working, error
    this.currentTask = null;
  }

  /**
   * 初始化 Agent
   */
  async initialize() {
    if (this.state !== 'idle') {
      console.log(`[Agent] Already ${this.state}`);
      return this;
    }

    this.state = 'initializing';
    this.emit('initializing');

    try {
      // 初始化服务注册表
      await this.services.initialize();
      
      // 初始化 NLP 引擎
      await this.nlp.initialize();
      
      // 启动浏览器
      await this.browser.launch();
      
      this.state = 'ready';
      this.emit('ready');
      console.log('[Agent] Ready');
      
      return this;
    } catch (error) {
      this.state = 'error';
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * 处理自然语言指令
   */
  async processCommand(command, options = {}) {
    if (this.state !== 'ready') {
      throw new Error(`Agent not ready (state: ${this.state})`);
    }

    this.state = 'working';
    this.currentTask = { command, startTime: Date.now() };
    this.emit('working', this.currentTask);

    try {
      // 获取页面上下文
      const context = await this.buildContext(options);
      
      // 通过 NLP 处理
      const nlpResult = await this.nlp.processInput(command, context);
      
      if (!nlpResult.success) {
        this.state = 'ready';
        return {
          success: false,
          error: nlpResult.error,
          code: nlpResult.code
        };
      }

      // 执行路由结果
      if (nlpResult.routedResult) {
        const result = {
          success: nlpResult.routedResult.success,
          intent: nlpResult.intent,
          confidence: nlpResult.confidence,
          explanation: nlpResult.explanation,
          ...nlpResult.routedResult
        };

        this.state = 'ready';
        this.currentTask = null;
        this.emit('ready');
        
        return result;
      }

      // 如果没有路由结果，返回 NLP 结果
      this.state = 'ready';
      this.currentTask = null;
      this.emit('ready');

      return nlpResult;
    } catch (error) {
      this.state = 'ready';
      this.currentTask = null;
      this.emit('ready', { error: error.message });
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 构建执行上下文
   */
  async buildContext(options = {}) {
    const context = {
      browser: this.browser,
      timestamp: Date.now()
    };

    // 获取当前页面信息
    try {
      const analysis = await this.browser.analyze();
      context.pageInfo = {
        url: analysis.url,
        title: analysis.title,
        elementCount: analysis.interactiveElements?.length || 0
      };
      context.elements = analysis.interactiveElements || [];
    } catch (e) {
      // 忽略页面分析错误
    }

    return context;
  }

  /**
   * 执行任务序列
   */
  async executeTask(task, options = {}) {
    return await this.executor.execute(task, options);
  }

  /**
   * 直接导航
   */
  async navigate(url) {
    return await this.browser.navigate(url);
  }

  /**
   * 获取页面分析
   */
  async analyze() {
    return await this.browser.analyze();
  }

  /**
   * 截图
   */
  async screenshot(options = {}) {
    return await this.browser.screenshot(options);
  }

  /**
   * 获取状态
   */
  getState() {
    return {
      state: this.state,
      browser: this.browser.getState(),
      currentTask: this.currentTask
    };
  }

  /**
   * 关闭 Agent
   */
  async close() {
    await this.browser.close();
    this.state = 'idle';
    this.emit('closed');
    console.log('[Agent] Closed');
  }
}

export default Agent;
