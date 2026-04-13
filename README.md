# WebClaw 独立版

让 AI 像人类一样操作浏览器的独立应用程序。基于 Playwright 构建，保留原有的扣子 API NLP 集成。

## 与原版 Chrome Extension 的区别

| 特性 | Chrome Extension | 独立版 |
|------|------------------|--------|
| 运行环境 | Chrome 浏览器 | Node.js |
| 启动方式 | 点击扩展图标 | 命令行/REPL |
| 控制方式 | 浏览器内弹出 | CLI / 程序调用 |
| API 调用 | 后台脚本 | 直接调用 |
| 截图范围 | 当前标签页 | 完整页面/视口 |
| 适用场景 | 日常浏览增强 | 自动化测试、批量操作 |

## 功能特性

- 🌐 **浏览器控制** - 使用 Playwright 实现浏览器自动化
- 🤖 **自然语言交互** - 通过扣子 API 理解自然语言指令
- 📸 **页面分析** - 自动识别页面可交互元素
- 🎯 **意图路由** - 将自然语言转换为具体操作
- 🔗 **多浏览器支持** - Chromium / Firefox / WebKit
- 💻 **CLI 工具** - 命令行和交互式 REPL 模式

## 快速开始

### 安装依赖

```bash
cd WebClaw-standalone
npm install
```

### 配置环境变量

创建 `.env` 文件（可选）：

```bash
# 扣子 API Token（必须）
COZE_API_TOKEN=your_api_token_here

# 可选配置
COZE_ENDPOINT=https://api.coze.cn
COZE_MODEL=coze-flash
BROWSER_TYPE=chromium
HEADLESS=false
VIEWPORT_WIDTH=1280
VIEWPORT_HEIGHT=800
```

### 基本使用

```bash
# 导航到网站
npx webclaw navigate https://example.com

# 执行自然语言命令
npx webclaw exec "点击登录按钮"

# 截图
npx webclaw screenshot output.png

# 分析页面
npx webclaw analyze

# 交互式模式
npx webclaw repl
```

## 命令详解

### `navigate <url>`

导航到指定 URL。

```bash
webclaw navigate https://google.com
webclaw open example.com
```

选项：
- `-b, --browser <browser>` - 使用的浏览器 (chromium/firefox/webkit)
- `--headless` - 无头模式运行
- `--token <token>` - 扣子 API Token
- `-o, --output <file>` - 保存截图

### `exec <command>`

执行自然语言命令。

```bash
webclaw exec "在搜索框输入 hello"
webclaw exec "点击搜索按钮"
webclaw exec "向下滚动"
webclaw e "打开 github.com"
```

支持的命令类型：

| 命令示例 | 说明 |
|---------|------|
| `打开 <url>` | 导航到网址 |
| `点击 <元素>` | 点击页面元素 |
| `填写 <输入框> 为 <内容>` | 填写表单 |
| `滚动 <方向>` | 滚动页面（上/下/顶部/底部） |
| `搜索 <关键词>` | 使用 Google 搜索 |
| `截图` | 截取当前页面 |
| `分析` | 分析页面结构 |

### `screenshot [file]`

截图当前页面。

```bash
webclaw screenshot my-page.png
webclaw shot -f full.png  # 截取整个页面
```

### `analyze`

分析当前页面结构，列出可交互元素。

```bash
webclaw analyze
webclaw info -j  # JSON 格式输出
```

### `repl`

进入交互式对话模式。

```bash
webclaw repl
webclaw repl -u https://example.com  # 启动时打开指定页面
```

### `run <file>`

执行任务文件。

```bash
webclaw run my-task.json
```

任务文件格式：

```json
{
  "goal": "登录 GitHub",
  "commands": [
    "打开 github.com",
    "点击登录按钮",
    "填写用户名为 myuser",
    "填写密码为 mypass",
    "点击登录"
  ]
}
```

## API 使用

作为模块引入使用：

```javascript
import { Agent } from './src/core/agent.js';

// 创建 Agent
const agent = new Agent({
  headless: false,
  apiToken: process.env.COZE_API_TOKEN
});

// 初始化
await agent.initialize();

// 导航
await agent.navigate('https://example.com');

// 执行自然语言命令
const result = await agent.processCommand('点击开始按钮');

// 截图
const screenshot = await agent.screenshot();

// 分析页面
const analysis = await agent.analyze();

// 关闭
await agent.close();
```

## 架构说明

```
WebClaw-standalone/
├── src/
│   ├── browser/
│   │   └── browser-manager.js   # Playwright 浏览器封装
│   ├── core/
│   │   ├── agent.js             # Agent 核心控制器
│   │   └── task-executor.js     # 任务执行器
│   ├── nlp/
│   │   ├── nlp-engine.js        # NLP 引擎（扣子 API）
│   │   └── intent-router.js     # 意图路由
│   ├── cli/
│   │   ├── index.js              # CLI 入口
│   │   └── repl.js               # 交互式 REPL
│   └── utils/
│       ├── config.js             # 配置管理
│       └── logger.js             # 日志工具
└── config/
    └── default.json              # 默认配置
```

## 与原版共存

WebClaw 独立版和 Chrome Extension 可以同时安装，互不影响：

- **Chrome Extension** - 用于日常浏览增强，点击图标即可使用
- **独立版** - 用于自动化任务、批量操作、集成到其他工具

## 常见问题

### Q: 提示 "API Token 未配置"

需要设置 `COZE_API_TOKEN` 环境变量：

```bash
export COZE_API_TOKEN=your_token_here
```

或在 `.env` 文件中配置。

### Q: 浏览器无法启动

确保已安装 Playwright 浏览器：

```bash
npx playwright install chromium
```

### Q: 元素定位失败

使用 `analyze` 命令查看页面元素，然后尝试更精确的描述。

## 开发

```bash
# 开发模式（监听文件变化）
npm run dev

# 运行测试
npm test
```

## License

MIT
