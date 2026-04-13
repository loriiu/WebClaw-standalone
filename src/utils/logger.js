/**
 * WebClaw 独立版 - 日志工具
 */

const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

class Logger {
  constructor(options = {}) {
    this.level = options.level || 'info';
    this.prefix = options.prefix || '';
    this.silent = options.silent || false;
  }

  getLevelValue(level) {
    return LOG_LEVELS[level] ?? LOG_LEVELS.info;
  }

  shouldLog(level) {
    return this.getLevelValue(level) <= this.getLevelValue(this.level);
  }

  formatMessage(level, message, ...args) {
    const timestamp = new Date().toISOString().substring(11, 23);
    const prefix = this.prefix ? `[${this.prefix}]` : '';
    return `[${timestamp}] ${prefix} ${message}`;
  }

  log(level, message, ...args) {
    if (this.silent || !this.shouldLog(level)) return;

    const formatted = this.formatMessage(level, message, ...args);
    
    switch (level) {
      case 'error':
        console.error(formatted, ...args);
        break;
      case 'warn':
        console.warn(formatted, ...args);
        break;
      case 'debug':
        console.debug(formatted, ...args);
        break;
      default:
        console.log(formatted, ...args);
    }
  }

  error(message, ...args) {
    this.log('error', message, ...args);
  }

  warn(message, ...args) {
    this.log('warn', message, ...args);
  }

  info(message, ...args) {
    this.log('info', message, ...args);
  }

  debug(message, ...args) {
    this.log('debug', message, ...args);
  }

  // 创建子日志器
  child(options = {}) {
    return new Logger({
      level: this.level,
      prefix: options.prefix || this.prefix,
      silent: options.silent ?? this.silent
    });
  }
}

// 导出单例
export const logger = new Logger({
  level: process.env.LOG_LEVEL || 'info',
  prefix: 'webclaw'
});

export default logger;
