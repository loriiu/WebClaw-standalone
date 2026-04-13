/**
 * WebClaw 独立版 - 任务执行器
 * 处理复杂的多步骤任务
 */

export class TaskExecutor {
  constructor(agent) {
    this.agent = agent;
  }

  /**
   * 执行任务
   * @param {Object|string} task - 任务对象或任务描述
   * @param {Object} options - 执行选项
   */
  async execute(task, options = {}) {
    const maxSteps = options.maxSteps || 10;
    const verbose = options.verbose || false;

    // 如果是字符串，构建简单任务
    if (typeof task === 'string') {
      task = { commands: [task] };
    }

    const { commands = [], goal } = task;
    
    console.log(`[TaskExecutor] Starting task: ${goal || 'Multi-step task'}`);
    console.log(`[TaskExecutor] Commands: ${commands.length}`);

    const results = [];
    let context = {};

    for (let i = 0; i < commands.length && i < maxSteps; i++) {
      const command = commands[i];
      console.log(`\n[Step ${i + 1}/${commands.length}] ${command}`);

      try {
        // 构建当前步骤的上下文
        const stepContext = {
          ...context,
          browser: this.agent.browser,
          step: i + 1,
          totalSteps: commands.length
        };

        // 执行命令
        const result = await this.agent.processCommand(command, stepContext);
        results.push({
          step: i + 1,
          command,
          result
        });

        if (verbose) {
          console.log(`  → Result:`, JSON.stringify(result, null, 2));
        }

        // 如果失败，可以选择停止或继续
        if (!result.success && !options.continueOnError) {
          console.log(`[TaskExecutor] Step ${i + 1} failed, stopping`);
          break;
        }

        // 更新上下文
        if (result.result) {
          context.lastResult = result.result;
        }

      } catch (error) {
        console.error(`[TaskExecutor] Step ${i + 1} error:`, error.message);
        results.push({
          step: i + 1,
          command,
          error: error.message
        });

        if (!options.continueOnError) {
          break;
        }
      }
    }

    const summary = this.summarizeResults(results);
    
    return {
      success: results.every(r => r.result?.success !== false),
      totalSteps: commands.length,
      executedSteps: results.length,
      results,
      summary
    };
  }

  /**
   * 总结执行结果
   */
  summarizeResults(results) {
    const succeeded = results.filter(r => r.result?.success).length;
    const failed = results.length - succeeded;

    return {
      total: results.length,
      succeeded,
      failed,
      successRate: results.length > 0 ? (succeeded / results.length * 100).toFixed(1) + '%' : '0%'
    };
  }

  /**
   * 创建自动化任务
   */
  createAutoTask(description, steps) {
    return {
      goal: description,
      commands: steps,
      metadata: {
        createdAt: new Date().toISOString()
      }
    };
  }

  /**
   * 解析自然语言任务为步骤
   */
  async parseTaskToSteps(taskDescription) {
    // 使用 NLP 将复杂任务分解为简单步骤
    const prompt = `将以下任务分解为浏览器操作步骤：
    
任务: "${taskDescription}"

支持的步骤类型：
- "打开 <url>" - 导航到指定网址
- "点击 <元素描述>" - 点击页面上的元素
- "填写 <输入框描述> 为 <内容>" - 在输入框中填写内容
- "滚动 <方向>" - 滚动页面，方向：上/下/顶部/底部
- "截图" - 截取当前页面
- "等待 <秒数> 秒" - 等待一段时间

请以 JSON 数组格式返回步骤，每个步骤是一个命令字符串：
["步骤1", "步骤2", ...]`;

    try {
      const response = await fetch('https://api.coze.cn/v3/chat', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.COZE_API_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'coze-flash',
          messages: [{ role: 'user', content: prompt }],
          stream: false
        })
      });

      const data = await response.json();
      const content = data.data?.messages?.[0]?.content || '';
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('[TaskExecutor] Failed to parse task:', error);
    }

    return [];
  }
}

export default TaskExecutor;
