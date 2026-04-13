/**
 * WebClaw 独立版 - NLP 引擎
 * 支持多种主流 API 格式：OpenAI、Anthropic Claude、扣子、通用 OpenAI 兼容
 */

import { IntentRouter } from './intent-router.js';

// API 类型常量
export const API_TYPES = {
  COZE: 'coze',           // 扣子 API (默认)
  OPENAI: 'openai',       // OpenAI 兼容格式
  ANTHROPIC: 'anthropic', // Anthropic Claude 格式
  CUSTOM: 'custom'        // 自定义 OpenAI 兼容端点
};

class NLPSettings {
  constructor() {
    // 扣子默认配置
    this.cozeDefaults = {
      endpoint: 'https://api.coze.cn',
      model: 'coze-flash'
    };
    // OpenAI 默认配置
    this.openaiDefaults = {
      endpoint: 'https://api.openai.com/v1',
      model: 'gpt-4o-mini'
    };
    // Anthropic 默认配置
    this.anthropicDefaults = {
      endpoint: 'https://api.anthropic.com/v1',
      model: 'claude-3-5-haiku-20240620',
      maxTokens: 1024
    };
  }
}

export class NLPEngine {
  constructor(options = {}) {
    this.settings = new NLPSettings();
    this.intentRouter = null;
    this.initialized = false;
    
    // 确定 API 类型：coze / openai / anthropic / custom
    const apiType = options.apiType || process.env.API_TYPE || API_TYPES.COZE;
    
    // 根据 API 类型初始化配置
    this.options = this._initOptions(apiType, options);
    this.options.apiType = apiType;
  }

  /**
   * 根据 API 类型初始化选项
   * @param {string} apiType - API 类型
   * @param {Object} options - 传入的配置选项
   * @returns {Object} 初始化后的配置
   */
  _initOptions(apiType, options) {
    switch (apiType) {
      case API_TYPES.OPENAI:
        return {
          apiKey: options.apiKey || process.env.OPENAI_API_KEY || process.env.API_KEY || '',
          endpoint: options.endpoint || process.env.OPENAI_ENDPOINT || process.env.API_BASE_URL || this.settings.openaiDefaults.endpoint,
          model: options.model || process.env.OPENAI_MODEL || process.env.API_MODEL || this.settings.openaiDefaults.model
        };

      case API_TYPES.ANTHROPIC:
        return {
          apiKey: options.apiKey || process.env.ANTHROPIC_API_KEY || process.env.API_KEY || '',
          endpoint: options.endpoint || process.env.ANTHROPIC_ENDPOINT || this.settings.anthropicDefaults.endpoint,
          model: options.model || process.env.ANTHROPIC_MODEL || process.env.API_MODEL || this.settings.anthropicDefaults.model,
          maxTokens: options.maxTokens || this.settings.anthropicDefaults.maxTokens
        };

      case API_TYPES.CUSTOM:
        return {
          apiKey: options.apiKey || process.env.API_KEY || '',
          endpoint: options.endpoint || process.env.API_BASE_URL || '',
          model: options.model || process.env.API_MODEL || 'gpt-4'
        };

      case API_TYPES.COZE:
      default:
        return {
          apiToken: options.apiToken || options.apiKey || process.env.COZE_API_TOKEN || process.env.API_KEY || '',
          endpoint: options.endpoint || process.env.COZE_ENDPOINT || this.settings.cozeDefaults.endpoint,
          model: options.model || process.env.COZE_MODEL || this.settings.cozeDefaults.model
        };
    }
  }

  /**
   * 初始化 NLP 引擎
   */
  async initialize() {
    this.intentRouter = new IntentRouter(this);
    this.initialized = true;
    
    const apiTypeName = {
      [API_TYPES.COZE]: 'Coze (扣子)',
      [API_TYPES.OPENAI]: 'OpenAI 兼容',
      [API_TYPES.ANTHROPIC]: 'Anthropic Claude',
      [API_TYPES.CUSTOM]: '自定义端点'
    }[this.options.apiType] || this.options.apiType;
    
    console.log(`[NLPEngine] Initialized with ${apiTypeName} API`);
    return this;
  }

  /**
   * 更新配置
   */
  updateSettings(settings) {
    if (settings.apiKey) this.options.apiKey = settings.apiKey;
    if (settings.apiToken) this.options.apiToken = settings.apiToken;
    if (settings.endpoint) this.options.endpoint = settings.endpoint;
    if (settings.model) this.options.model = settings.model;
    if (settings.maxTokens) this.options.maxTokens = settings.maxTokens;
  }

  /**
   * 处理用户输入
   * @param {string} userInput - 用户自然语言输入
   * @param {Object} context - 上下文信息
   * @returns {Object} 处理结果
   */
  async processInput(userInput, context = {}) {
    // 检查 API 凭证
    const credentialCheck = this._checkCredentials();
    if (!credentialCheck.valid) {
      return {
        success: false,
        error: credentialCheck.error,
        code: credentialCheck.code
      };
    }

    try {
      // 构建提示词
      const prompt = this.buildPrompt(userInput, context);
      
      // 根据 API 类型调用对应的 API
      let response;
      switch (this.options.apiType) {
        case API_TYPES.OPENAI:
        case API_TYPES.CUSTOM:
          response = await this._callOpenAICompatibleAPI(prompt);
          break;
        case API_TYPES.ANTHROPIC:
          response = await this._callAnthropicAPI(prompt);
          break;
        case API_TYPES.COZE:
        default:
          response = await this._callCozeAPI(prompt);
          break;
      }
      
      // 解析响应
      const result = this.parseResponse(response, this.options.apiType);
      
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
        code: 'PROCESS_ERROR',
        apiType: this.options.apiType
      };
    }
  }

  /**
   * 检查 API 凭证
   */
  _checkCredentials() {
    const { apiType, apiKey, apiToken, endpoint } = this.options;
    
    if (apiType === API_TYPES.COZE) {
      if (!apiToken) {
        return {
          valid: false,
          error: 'API Token 未配置，请设置 COZE_API_TOKEN 环境变量或配置文件中设置',
          code: 'NO_API_TOKEN'
        };
      }
    } else {
      if (!apiKey) {
        return {
          valid: false,
          error: 'API Key 未配置，请设置 API_KEY 环境变量或配置文件中设置',
          code: 'NO_API_KEY'
        };
      }
    }
    
    if (!endpoint) {
      return {
        valid: false,
        error: 'API 端点未配置，请设置对应的 ENDPOINT 环境变量',
        code: 'NO_ENDPOINT'
      };
    }
    
    return { valid: true };
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
   * 调用 OpenAI 兼容格式 API
   * 支持: OpenAI, Azure OpenAI, 以及各类兼容 OpenAI 格式的第三方服务
   * 
   * 端点: POST /v1/chat/completions
   * 格式: {"model": "gpt-4", "messages": [{"role": "user", "content": "..."}]}
   */
  async _callOpenAICompatibleAPI(prompt) {
    const url = `${this.options.endpoint}/v1/chat/completions`;
    
    const requestBody = {
      model: this.options.model,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1000
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.options.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI 兼容 API 调用失败: ${response.status} - ${errorText}`);
    }

    return await response.json();
  }

  /**
   * 调用 Anthropic Claude API
   * 
   * 端点: POST /v1/messages
   * 格式: {"model": "claude-3-opus", "messages": [...], "max_tokens": 1024}
   */
  async _callAnthropicAPI(prompt) {
    const url = `${this.options.endpoint}/messages`;
    
    const requestBody = {
      model: this.options.model,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: this.options.maxTokens || 1024
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'x-api-key': this.options.apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Anthropic Claude API 调用失败: ${response.status} - ${errorText}`);
    }

    return await response.json();
  }

  /**
   * 调用扣子 API (原有实现)
   * 
   * 端点: POST /v3/chat
   */
  async _callCozeAPI(prompt) {
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
      throw new Error(`扣子 API 调用失败: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    if (data.code !== 0) {
      throw new Error(`扣子 API 错误: ${data.msg || '未知错误'}`);
    }

    return data;
  }

  /**
   * 解析 API 响应 - 统一格式
   * @param {Object} response - API 响应
   * @param {string} apiType - API 类型
   */
  parseResponse(response, apiType) {
    try {
      let content = '';
      
      // 根据不同 API 类型提取响应内容
      switch (apiType) {
        case API_TYPES.OPENAI:
        case API_TYPES.CUSTOM:
          // OpenAI 兼容格式: response.choices[0].message.content
          content = response.choices?.[0]?.message?.content || '';
          break;
          
        case API_TYPES.ANTHROPIC:
          // Anthropic 格式: response.content[0].text
          content = response.content?.[0]?.text || '';
          break;
          
        case API_TYPES.COZE:
        default:
          // 扣子格式: response.data.messages[0].content
          const message = response.data?.messages?.[0];
          content = message?.content || '';
          break;
      }
      
      if (!content) {
        return {
          success: true,
          intent: 'general',
          confidence: 0.5,
          explanation: '未获取到有效响应内容',
          originalResponse: response
        };
      }
      
      // 提取 JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return {
          success: true,
          intent: 'general',
          confidence: 0.5,
          explanation: content,
          originalResponse: content,
          apiType
        };
      }

      const parsed = JSON.parse(jsonMatch[0]);
      return {
        success: true,
        confidence: parsed.confidence || 0.8,
        intent: parsed.intent || 'general',
        entities: parsed.entities || {},
        explanation: parsed.explanation || '',
        suggestedAction: parsed.suggestedAction || '',
        originalResponse: content,
        apiType
      };
    } catch (error) {
      console.error('[NLPEngine] Parse error:', error);
      return {
        success: true,
        intent: 'general',
        confidence: 0.5,
        explanation: '解析响应失败',
        error: error.message,
        originalResponse: JSON.stringify(response),
        apiType
      };
    }
  }

  /**
   * 获取当前配置的 API 类型
   */
  getApiType() {
    return this.options.apiType;
  }

  /**
   * 切换 API 类型
   * @param {string} apiType - 新的 API 类型
   * @param {Object} newOptions - 新的配置选项
   */
  async switchApiType(apiType, newOptions = {}) {
    this.options = this._initOptions(apiType, { ...this.options, ...newOptions });
    this.options.apiType = apiType;
    console.log(`[NLPEngine] Switched to ${apiType} API`);
  }
}
