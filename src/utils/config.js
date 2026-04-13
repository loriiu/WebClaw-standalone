/**
 * WebClaw 独立版 - 配置管理
 */

import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

class Config {
  constructor() {
    this.config = this.loadConfig();
  }

  loadConfig() {
    const defaults = {
      coze: {
        endpoint: process.env.COZE_ENDPOINT || 'https://api.coze.cn',
        model: process.env.COZE_MODEL || 'coze-flash'
      },
      browser: {
        type: process.env.BROWSER_TYPE || 'chromium',
        headless: process.env.HEADLESS === 'true',
        viewport: {
          width: parseInt(process.env.VIEWPORT_WIDTH) || 1280,
          height: parseInt(process.env.VIEWPORT_HEIGHT) || 800
        },
        timeout: parseInt(process.env.BROWSER_TIMEOUT) || 30000
      },
      task: {
        maxSteps: 10,
        continueOnError: false,
        verbose: false
      }
    };

    // 尝试加载用户配置
    const configPaths = [
      join(process.cwd(), 'webclaw.config.json'),
      join(__dirname, '../../config/default.json'),
      join(process.env.HOME || '', '.webclaw', 'config.json')
    ];

    for (const configPath of configPaths) {
      if (existsSync(configPath)) {
        try {
          const userConfig = JSON.parse(readFileSync(configPath, 'utf-8'));
          return this.mergeConfig(defaults, userConfig);
        } catch (e) {
          console.warn(`Failed to load config from ${configPath}:`, e.message);
        }
      }
    }

    return defaults;
  }

  mergeConfig(defaults, user) {
    const result = { ...defaults };
    
    for (const key in user) {
      if (typeof user[key] === 'object' && !Array.isArray(user[key])) {
        result[key] = { ...defaults[key], ...user[key] };
      } else {
        result[key] = user[key];
      }
    }

    return result;
  }

  get(key) {
    const keys = key.split('.');
    let value = this.config;
    
    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = value[k];
      } else {
        return undefined;
      }
    }

    return value;
  }

  set(key, value) {
    const keys = key.split('.');
    let obj = this.config;
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!obj[keys[i]]) {
        obj[keys[i]] = {};
      }
      obj = obj[keys[i]];
    }

    obj[keys[keys.length - 1]] = value;
  }
}

// 导出单例
export const config = new Config();
export default config;
