# WebClaw 独立版

## 目录结构

```
WebClaw-standalone/
├── package.json                 # 项目配置
├── README.md                    # 文档
├── .env.example                 # 环境变量示例
├── .gitignore                   # Git 忽略文件
│
├── config/
│   └── default.json             # 默认配置
│
├── src/
│   ├── browser/
│   │   ├── browser-manager.js   # Playwright 浏览器管理器
│   │   └── page-controller.js   # 页面控制器
│   │
│   ├── core/
│   │   ├── agent.js             # Agent 核心控制器
│   │   └── task-executor.js     # 任务执行器
│   │
│   ├── nlp/
│   │   ├── nlp-engine.js        # NLP 引擎（扣子 API）
│   │   └── intent-router.js     # 意图路由器
│   │
│   ├── services/
│   │   └── registry.js          # 服务注册表
│   │
│   ├── cli/
│   │   ├── index.js             # CLI 入口
│   │   └── repl.js              # 交互式 REPL
│   │
│   └── utils/
│       ├── config.js            # 配置管理
│       └── logger.js            # 日志工具
│
├── examples/
│   ├── demo-login.json          # 登录示例
│   ├── github-trending.json     # GitHub 热门
│   └── web-scraping.json        # 网页采集
│
└── tests/
    └── integration.test.js      # 集成测试
```

## 快速开始

### 1. 安装

```bash
cd WebClaw-standalone
npm install
```

### 2. 配置

创建 `.env` 文件：

```bash
cp .env.example .env
# 编辑 .env，填入 COZE_API_TOKEN
```

### 3. 使用

```bash
# 交互模式
npm run repl

# 导航
npm start -- navigate github.com

# 执行命令
npm start -- exec "点击登录按钮"

# 截图
npm start -- screenshot

# 分析页面
npm start -- analyze
```

## 核心模块

### BrowserManager

浏览器控制核心，封装 Playwright API。

```javascript
import { BrowserManager } from './src/browser/browser-manager.js';

const browser = new BrowserManager({ headless: false });
await browser.launch();
await browser.navigate('https://example.com');
await browser.clickByDescription('Submit');
await browser.screenshot();
await browser.close();
```

### Agent

整合所有组件的智能代理。

```javascript
import { Agent } from './src/core/agent.js';

const agent = new Agent({ headless: false });
await agent.initialize();
const result = await agent.processCommand('点击开始按钮');
await agent.close();
```

### NLPEngine

扣子 API 自然语言处理。

```javascript
import { NLPEngine } from './src/nlp/nlp-engine.js';

const nlp = new NLPEngine({ apiToken: 'your_token' });
await nlp.initialize();
const result = await nlp.processInput('点击登录', { pageInfo });
```

### IntentRouter

意图路由，将自然语言映射到具体操作。

```javascript
import { IntentRouter } from './src/nlp/intent-router.js';

const router = new IntentRouter(nlpEngine);
const result = await router.route('click', intent, context);
```

### ServiceRegistry

服务注册与执行。

```javascript
import { ServiceRegistry } from './src/services/registry.js';

const registry = new ServiceRegistry();
await registry.initialize();
await registry.execute('navigate', { url: 'https://example.com' }, context);
```

## CLI 命令

| 命令 | 说明 | 示例 |
|------|------|------|
| `navigate <url>` | 导航到 URL | `navigate github.com` |
| `exec <command>` | 执行自然语言命令 | `exec "点击登录"` |
| `screenshot [file]` | 截图 | `screenshot out.png` |
| `analyze` | 分析页面 | `analyze` |
| `repl` | 交互模式 | `repl` |
| `run <file>` | 执行任务文件 | `run task.json` |

## 技术栈

- **运行时**: Node.js 18+
- **浏览器控制**: Playwright
- **CLI**: Commander.js
- **交互**: Inquirer.js
- **NLP**: 扣子 API (Coze)
- **语言**: JavaScript (ES Modules)
