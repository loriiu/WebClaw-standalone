#!/usr/bin/env node

/**
 * WebClaw 独立版 - 交互式 REPL
 */

import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { Agent } from '../core/agent.js';

export class REPL {
  constructor(options = {}) {
    this.options = {
      browser: options.browser || 'chromium',
      headless: options.headless ?? false,
      apiToken: options.token || process.env.COZE_API_TOKEN,
      url: options.url,
      ...options
    };
    this.agent = null;
    this.history = [];
    this.savedScreenshot = null;
  }

  async start() {
    console.log(chalk.blue(`
╔═══════════════════════════════════════════════════╗
║           WebClaw 独立版 - 交互模式                 ║
╠═══════════════════════════════════════════════════╣
║  输入自然语言命令控制浏览器                         ║
║  输入 help 查看帮助                               ║
║  输入 exit 退出                                   ║
╚═══════════════════════════════════════════════════╝
    `));

    // 检查 API Token
    if (!this.options.apiToken) {
      console.log(chalk.yellow('⚠️  未设置 COZE_API_TOKEN 环境变量'));
      console.log(chalk.gray('   某些 AI 功能可能不可用'));
    }

    // 初始化 Agent
    const spinner = ora('正在初始化...').start();
    
    try {
      this.agent = new Agent(this.options);
      await this.agent.initialize();
      spinner.succeed('浏览器已启动');

      // 如果指定了初始 URL
      if (this.options.url) {
        await this.navigateTo(this.options.url);
      }

      // 进入交互循环
      await this.interact();
    } catch (error) {
      spinner.fail('初始化失败: ' + error.message);
      console.log(chalk.gray('\n错误详情:'), error.stack);
      process.exit(1);
    }
  }

  async interact() {
    while (true) {
      try {
        const { command } = await inquirer.prompt([
          {
            type: 'input',
            name: 'command',
            message: chalk.green('webclaw > '),
            prefix: '',
            validate: (input) => input.trim().length > 0 || true
          }
        ]);

        const trimmed = command.trim();

        // 记录历史
        if (trimmed) {
          this.history.push(trimmed);
        }

        // 处理内置命令
        if (trimmed === 'exit' || trimmed === 'quit' || trimmed === 'q') {
          await this.cleanup();
          break;
        }

        if (trimmed === 'help' || trimmed === '?') {
          this.printHelp();
          continue;
        }

        if (trimmed === 'url') {
          const state = this.agent.browser.getState();
          console.log(chalk.blue('当前 URL:'), state.url || '(无)');
          continue;
        }

        if (trimmed === 'screenshot' || trimmed === 'shot') {
          await this.takeScreenshot();
          continue;
        }

        if (trimmed === 'analyze' || trimmed === 'info') {
          await this.analyzePage();
          continue;
        }

        if (trimmed === 'clear' || trimmed === 'cls') {
          console.clear();
          continue;
        }

        if (trimmed === 'history') {
          this.printHistory();
          continue;
        }

        if (trimmed.startsWith('goto ') || trimmed.startsWith('open ')) {
          const url = trimmed.split(' ').slice(1).join(' ');
          await this.navigateTo(url);
          continue;
        }

        // 执行自然语言命令
        await this.executeCommand(trimmed);
      } catch (error) {
        if (error.isTtyErrorPrompt) {
          // 忽略 TTY 错误
        } else {
          console.log(chalk.red('错误:'), error.message);
        }
      }
    }
  }

  printHelp() {
    console.log(chalk.blue(`
╔═══════════════════════════════════════════════════╗
║                    帮助信息                        ║
╠═══════════════════════════════════════════════════╣
║  内置命令:                                         ║
║  ─────────────────────────────────────────────────║
║  help, ?        - 显示帮助信息                     ║
║  exit, quit, q  - 退出程序                         ║
║  clear, cls     - 清除屏幕                         ║
║  history        - 显示命令历史                     ║
║                                                    ║
║  浏览器命令:                                        ║
║  ─────────────────────────────────────────────────║
║  url             - 显示当前 URL                    ║
║  screenshot,shot - 截图并保存                      ║
║  analyze, info  - 分析当前页面                    ║
║  goto <url>     - 导航到指定 URL                   ║
║  open <url>     - 同 goto                          ║
║                                                    ║
║  自然语言命令示例:                                  ║
║  ─────────────────────────────────────────────────║
║  "点击登录按钮"                                    ║
║  "在搜索框输入 hello"                              ║
║  "向下滚动页面"                                    ║
║  "滚动到页面底部"                                  ║
║  "打开 google.com"                                ║
║  "搜索 Node.js"                                   ║
║  "截一张图"                                        ║
╚═══════════════════════════════════════════════════╝
    `));
  }

  printHistory() {
    if (this.history.length === 0) {
      console.log(chalk.gray('暂无命令历史'));
      return;
    }

    console.log(chalk.blue('\n命令历史:'));
    this.history.forEach((cmd, i) => {
      console.log(chalk.gray(`  ${i + 1}. ${cmd}`));
    });
  }

  async navigateTo(url) {
    const spinner = ora(`正在导航到 ${url}...`).start();
    
    try {
      // 确保 URL 有协议
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }

      const result = await this.agent.navigate(url);
      spinner.succeed(`已导航到: ${result.url}`);
      console.log(chalk.gray(`  标题: ${result.title}`));
    } catch (error) {
      spinner.fail('导航失败: ' + error.message);
    }
  }

  async executeCommand(command) {
    const spinner = ora('正在处理...').start();

    try {
      const result = await this.agent.processCommand(command);
      spinner.stop();

      if (result.success === false) {
        console.log(chalk.red('❌ 失败:'), result.error);
        if (result.hint) {
          console.log(chalk.yellow('💡 提示:'), result.hint);
        }
        return;
      }

      console.log(chalk.green('✅ 成功'));

      if (result.explanation) {
        console.log(chalk.blue('📝 理解:'), result.explanation);
      }

      if (result.action) {
        console.log(chalk.blue('🔧 执行:'), result.action);
      }

      if (result.content && result.type === 'response') {
        console.log(chalk.cyan('💬 '), result.content);
      }

      if (result.url) {
        console.log(chalk.blue('🔗 URL:'), result.url);
      }

    } catch (error) {
      spinner.fail('执行失败: ' + error.message);
    }
  }

  async takeScreenshot() {
    const spinner = ora('正在截图...').start();

    try {
      const result = await this.agent.screenshot();
      const filename = `screenshot-${Date.now()}.png`;
      
      const { writeFileSync } = await import('fs');
      writeFileSync(filename, result.buffer);
      
      spinner.succeed(`截图已保存: ${filename}`);
      this.savedScreenshot = filename;
    } catch (error) {
      spinner.fail('截图失败: ' + error.message);
    }
  }

  async analyzePage() {
    const spinner = ora('正在分析页面...').start();

    try {
      const analysis = await this.agent.analyze();
      spinner.stop();

      console.log(chalk.blue('\n📊 页面分析'));
      console.log(chalk.gray('─'.repeat(50)));
      console.log(chalk.blue('URL:'), analysis.url);
      console.log(chalk.blue('标题:'), analysis.title);
      console.log(chalk.blue('视口:'), `${analysis.viewport.width}x${analysis.viewport.height}`);
      console.log(chalk.blue('页面高度:'), `${analysis.scrollHeight}px`);
      console.log(chalk.blue('\n可交互元素:'), `(${analysis.interactiveElements.length} 个)`);
      
      analysis.interactiveElements.slice(0, 20).forEach((el, i) => {
        const text = el.text?.substring(0, 35) || el.ariaLabel?.substring(0, 35) || '';
        const prefix = el.href ? '🔗' : '📌';
        console.log(`  ${prefix} [${el.tag}] ${text}`);
      });

      if (analysis.interactiveElements.length > 20) {
        console.log(chalk.gray(`  ... 还有 ${analysis.interactiveElements.length - 20} 个元素`));
      }
    } catch (error) {
      spinner.fail('分析失败: ' + error.message);
    }
  }

  async cleanup() {
    console.log(chalk.blue('\n正在关闭浏览器...'));
    if (this.agent) {
      await this.agent.close();
    }
    console.log(chalk.green('再见! 👋'));
  }
}

// 如果直接运行此文件
if (import.meta.url === `file://${process.argv[1]}`) {
  const repl = new REPL();
  repl.start().catch(console.error);
}

export default REPL;
