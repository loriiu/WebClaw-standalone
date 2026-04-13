/**
 * WebClaw 独立版 - NLP 引擎
 * 适配独立运行版本，保留扣子 API 集成
 */

import { IntentRouter } from './intent-router.js';

class NLPSettings {
  constructor() {
    this.defaultEndpoint = 'https://api.coze.cn';
    this.defaultModel = 'coze-flash';
  }
}

export class NLPEngine {
  constructor(options = {}) {
    this.settings = new NLPSettings();
    this.intentRouter = null;
    this.options = {
      apiToken: options.apiToken || process.env.COZE_API_TOKEN || '',
      endpoint: options.endpoint || process.env.COZE_ENDPOINT || this.settings.defaultEndpoint,
      model: options.model || process.env.COZE_MODEL || this.settings.defaultModel,
      ...options
    };
    this.initialized = false;
  }

  /**
   * 初始化 NLP 引擎
   */
  async initialize() {
    this.intentRouter = new IntentRouter(this);
    this.initialized = true;
    console.log('[NLPEngine] Initialized with Coze integration');
    return this;
  }

  /**
   * 更新配置
   */
  updateSettings(settings) {
    if (settings.apiToken) this.options.apiToken = settings.apiToken;
    if (settings.endpoint) this.options.endpoint = settings.endpoint;
    if (settings.model) this.options.model = settings.model;
  }

  /**
   * 处理用户输入
   * @param {string} userInput - 用户自然语言输入
   * @param {Object} context - 上下文信息
   * @returns {Object} 处理结果
   */
  async processInput(userInput, context = {}) {
    if (!this.options.apiToken) {
      return {
        success: false,
        error: 'API Token 未配置，请设置 COZE_API_TOKEN 环境变量或配置文件中设置',
        code: 'NO_API_TOKEN'
      };
    }

    try {
      // 构建提示词
      const prompt = this.buildPrompt(userInput, context);
      
      // 调用扣子 API
      const response = await this.callCozeAPI(prompt);
      
      // 解析响应
      const result = this.parseResponse(response);
      
      // 如果有识别的意图，进行路由
      if (result.intent) {
        result.routedResult = await this.intentRouter.route(result.intent, result, context);
      }
      
      return result;
    } catch (error) {
      console.error('[NLPEngine] Process error:', error);
      return {
        success: false,
        error: error.message,
        code: 'PROCESS_ERROR'
      };
    }
  }

  /**
   * 构建提示词
   */
  buildPrompt(userInput, context) {
    const contextInfo = context.pageInfo ? `
当前页面信息：
- URL: ${context.pageInfo.url}
- 标题: ${context.pageInfo.title}
- 可交互元素数量: ${context.pageInfo.elementCount || 0}
` : '';

    const elementInfo = context.elements ? `
页面可交互元素：
${context.elements.slice(0, 20).map((el, i) => 
  `${i + 1}. [${el.tag}] ${el.text || el.ariaLabel || el.type || ''} ${el.href ? `(链接: ${el.href.substring(0, 50)})` : ''}`
).join('\n')}
` : '';

    return `你是 WebClaw 独立版应用的 AI 助手。请分析用户的自然语言指令，并返回结构化的意图信息。

${contextInfo}
${elementInfo}

用户指令：「${userInput}」

请返回 JSON 格式的分析结果：
{
  "intent": "意图类型 (click|fill|scroll|navigate|search|analyze|general)",
  "confidence": 0.0-1.0 的置信度,
  "entities": {
    "target": "操作目标描述",
    "value": "要填写的值（如果是 fill 意图）",
    "direction": "滚动方向（如果是 scroll 意图）: up/down/top/bottom",
    "amount": "滚动量或次数（可选）",
    "url": "目标 URL（如果是 navigate 意图）",
    "query": "搜索词（如果是 search 意图）"
  },
  "explanation": "对指令的理解说明",
  "suggestedAction": "建议的具体操作"
}

请只返回 JSON，不要有其他内容。`;
  }

  /**
   * 调用扣子 API
   */
  async callCozeAPI(prompt) {
    const url = `${this.options.endpoint}/v3/chat`;
    
    const requestBody = {
      model: this.options.model,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      stream: false
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.options.apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API 调用失败: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    if (data.code !== 0) {
      throw new Error(`API 错误: ${data.msg || '未知错误'}`);
    }

    return data;
  }

  /**
   * 解析 API 响应
   */
  parseResponse(response) {
    try {
      const message = response.data?.messages?.[0];
      if (!message) {
        throw new Error('API 响应中没有消息内容');
      }

      const content = message.content || '';
      
      // 提取 JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return {
          success: true,
          intent: 'general',
          confidence: 0.5,
          explanation: content,
          originalResponse: content
        };
      }

      const parsed = JSON.parse(jsonMatch[0]);
      return {
        success: true,
        confidence: parsed.confidence || 0.8,
        intent: parsed.intent || 'general',
        entities: parsed.entities || {},
        explanation: parsed.explanation || '',
        suggestedAction: parsed.suggestedAction || ''
      };
    } catch (error) {
      console.error('[NLPEngine] Parse error:', error);
      return {
        success: false,
        error: '解析响应失败',
        code: 'PARSE_ERROR'
      };
    }
  }

  /**
   * 获取意图路由器
   */
  getIntentRouter() {
    return this.intentRouter;
  }
}

export default NLPEngine;
