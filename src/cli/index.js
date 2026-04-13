#!/usr/bin/env node

/**
 * WebClaw 独立版 - CLI 入口
 */

import { Command } from 'commander';
import { Agent } from '../core/agent.js';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pkg = JSON.parse(
  await import('fs').then(fs => 
    fs.readFileSync(join(__dirname, '../../package.json'), 'utf-8')
  ).catch(() => '{"version": "0.1.0"}')
);

const program = new Command();

program
  .name('webclaw')
  .description('WebClaw 独立版 - 让 AI 像人类一样操作浏览器')
  .version(pkg.version || '0.1.0');

/**
 * 初始化 Agent
 */
async function createAgent(options) {
  const agent = new Agent({
    browser: options.browser,
    headless: options.headless,
    apiToken: options.token || process.env.COZE_API_TOKEN,
    endpoint: options.endpoint,
    model: options.model
  });

  await agent.initialize();
  return agent;
}

/**
 * 执行命令
 */
async function runCommand(agent, command, options) {
  const result = await agent.processCommand(command, {
    verbose: options.verbose
  });

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    printResult(result);
  }

  return result;
}

/**
 * 打印结果
 */
function printResult(result) {
  if (result.success === false) {
    console.error('❌ 失败:', result.error);
    if (result.hint) {
      console.log('💡 提示:', result.hint);
    }
    return;
  }

  console.log('✅ 成功');
  
  if (result.explanation) {
    console.log('📝 理解:', result.explanation);
  }

  if (result.intent) {
    console.log('🎯 意图:', result.intent);
  }

  if (result.action) {
    console.log('🔧 执行:', result.action);
  }

  if (result.content && result.type === 'response') {
    console.log('💬 回答:', result.content);
  }

  if (result.url) {
    console.log('🔗 URL:', result.url);
  }
}

// 命令: 导航
program
  .command('navigate <url>')
  .alias('open')
  .description('导航到指定 URL')
  .option('-b, --browser <browser>', '使用的浏览器', 'chromium')
  .option('--headless', '无头模式运行')
  .option('--token <token>', '扣子 API Token')
  .option('-o, --output <file>', '保存截图到文件')
  .action(async (url, options) => {
    const agent = await createAgent(options);
    
    try {
      const result = await agent.navigate(url);
      
      if (result.success) {
        console.log(`✅ 已导航到: ${result.url}`);
        console.log(`   标题: ${result.title}`);
        console.log(`   状态: ${result.status}`);
      }

      // 可选：保存截图
      if (options.output) {
        const screenshot = await agent.screenshot();
        if (screenshot.success) {
          writeFileSync(options.output, screenshot.buffer);
          console.log(`📸 截图已保存: ${options.output}`);
        }
      }
    } finally {
      await agent.close();
    }
  });

// 命令: 执行自然语言命令
program
  .command('exec <command>')
  .alias('e')
  .description('执行自然语言命令')
  .option('-b, --browser <browser>', '使用的浏览器', 'chromium')
  .option('--headless', '无头模式运行')
  .option('--token <token>', '扣子 API Token')
  .option('-u, --url <url>', '初始 URL')
  .option('-j, --json', '输出 JSON 格式')
  .option('-v, --verbose', '详细输出')
  .option('-o, --output <file>', '保存截图到文件')
  .action(async (command, options) => {
    const agent = await createAgent(options);

    try {
      // 如果指定了初始 URL
      if (options.url) {
        await agent.navigate(options.url);
      }

      const result = await runCommand(agent, command, options);

      // 可选：保存截图
      if (options.output && result.success) {
        const screenshot = await agent.screenshot();
        if (screenshot.success) {
          writeFileSync(options.output, screenshot.buffer);
          console.log(`📸 截图已保存: ${options.output}`);
        }
      }
    } finally {
      await agent.close();
    }
  });

// 命令: 截图
program
  .command('screenshot [file]')
  .alias('shot')
  .description('截取当前页面')
  .option('-f, --full', '截取整个页面')
  .option('-b, --browser <browser>', '使用的浏览器', 'chromium')
  .option('--headless', '无头模式运行')
  .option('--token <token>', '扣子 API Token')
  .option('-u, --url <url>', '初始 URL')
  .action(async (file, options) => {
    const agent = await createAgent(options);

    try {
      if (options.url) {
        await agent.navigate(options.url);
      }

      const screenshot = await agent.screenshot({ fullPage: options.full });
      
      if (screenshot.success) {
        const outputFile = file || `screenshot-${Date.now()}.png`;
        writeFileSync(outputFile, screenshot.buffer);
        console.log(`📸 截图已保存: ${outputFile}`);
        console.log(`   大小: ${(screenshot.buffer.length / 1024).toFixed(1)} KB`);
      }
    } finally {
      await agent.close();
    }
  });

// 命令: 分析页面
program
  .command('analyze')
  .alias('info')
  .description('分析当前页面结构')
  .option('-b, --browser <browser>', '使用的浏览器', 'chromium')
  .option('--headless', '无头模式运行')
  .option('--token <token>', '扣子 API Token')
  .option('-u, --url <url>', '初始 URL')
  .option('-j, --json', '输出 JSON 格式')
  .action(async (options) => {
    const agent = await createAgent(options);

    try {
      if (options.url) {
        await agent.navigate(options.url);
      }

      const analysis = await agent.analyze();

      if (options.json) {
        console.log(JSON.stringify(analysis, null, 2));
      } else {
        console.log('📊 页面分析');
        console.log('─'.repeat(50));
        console.log(`URL: ${analysis.url}`);
        console.log(`标题: ${analysis.title}`);
        console.log(`视口: ${analysis.viewport.width}x${analysis.viewport.height}`);
        console.log(`页面高度: ${analysis.scrollHeight}px`);
        console.log(`\n可交互元素 (${analysis.interactiveElements.length} 个):`);
        
        analysis.interactiveElements.slice(0, 30).forEach((el, i) => {
          const text = el.text?.substring(0, 40) || el.ariaLabel?.substring(0, 40) || '';
          const type = el.tag;
          const extra = el.href ? ' 🔗' : '';
          console.log(`  ${i + 1}. [${type}] ${text}${extra}`);
        });

        if (analysis.interactiveElements.length > 30) {
          console.log(`  ... 还有 ${analysis.interactiveElements.length - 30} 个元素`);
        }
      }
    } finally {
      await agent.close();
    }
  });

// 命令: 交互模式
program
  .command('repl')
  .description('进入交互式对话模式')
  .option('-b, --browser <browser>', '使用的浏览器', 'chromium')
  .option('--headless', '无头模式运行')
  .option('--token <token>', '扣子 API Token')
  .option('-u, --url <url>', '初始 URL')
  .action(async (options) => {
    const { REPL } = await import('./repl.js');
    const repl = new REPL(options);
    await repl.start();
  });

// 命令: 执行任务文件
program
  .command('run <file>')
  .description('执行任务文件')
  .option('-b, --browser <browser>', '使用的浏览器', 'chromium')
  .option('--headless', '无头模式运行')
  .option('--token <token>', '扣子 API Token')
  .option('-v, --verbose', '详细输出')
  .action(async (file, options) => {
    const { readFileSync } = await import('fs');
    
    try {
      const content = readFileSync(file, 'utf-8');
      const task = JSON.parse(content);
      
      const agent = await createAgent(options);
      
      try {
        const executor = await import('../core/task-executor.js').then(m => new m.TaskExecutor(agent));
        const result = await executor.execute(task, {
          verbose: options.verbose
        });

        console.log('\n📊 执行摘要:');
        console.log(`   总步骤: ${result.totalSteps}`);
        console.log(`   已执行: ${result.executedSteps}`);
        console.log(`   成功率: ${result.summary.successRate}`);
      } finally {
        await agent.close();
      }
    } catch (error) {
      console.error('❌ 执行失败:', error.message);
      process.exit(1);
    }
  });

// 全局选项
program
  .option('-t, --token <token>', '扣子 API Token')
  .option('-e, --endpoint <url>', 'API Endpoint')
  .option('-m, --model <model>', '使用的模型');

// 默认命令
program.action(() => {
  program.help();
});

program.parse();
