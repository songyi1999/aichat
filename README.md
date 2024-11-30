# AI Chat Browser Extension

一个强大的Chrome浏览器扩展，支持智能文档对话。可以自动读取当前页面内容，让你直接与文档进行对话，获取相关信息和解答。

## 功能特点

- 📄 智能文档对话 - 自动提取当前页面内容，实现与文档的智能交互
- 📝 上下文理解 - AI助手能理解页面内容，提供准确的回答
- 🚀 快速访问 - 点击浏览器工具栏图标即可打开聊天界面
- 💬 实时对话 - 支持流式响应，实现即时对话体验
- 🎨 美观界面 - 现代化的聊天界面设计，包含用户头像和消息气泡
- ⚙️ 灵活配置 - 可自定义API设置，支持多种AI服务提供商
- 🔒 安全可靠 - 本地存储API密钥，确保安全性

## 安装说明

1. 下载或克隆本仓库到本地
2. 打开Chrome浏览器，进入扩展管理页面 (`chrome://extensions/`)
3. 开启右上角的"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择本项目的文件夹

## 使用方法

1. 打开任意网页，点击浏览器工具栏中的扩展图标
2. 扩展会自动读取当前页面的内容
3. 在聊天界面中输入你的问题，例如：
   - "总结一下这篇文章的主要内容"
   - "这个页面讲了什么？"
   - "帮我解释一下第三段的内容"
4. AI助手会基于页面内容，为你提供相关的回答

## 文件结构

- `manifest.json` - 扩展配置文件
- `background.js` - 后台服务脚本，处理API请求
- `content.js` - 内容脚本，处理UI交互和页面内容提取
- `content.css` - 样式文件，定义聊天界面外观
- `images` - 图片资源，包括图标和背景图
- `README.md` - 项目说明
- `lib` - 第三方库` 
- `lib\github.min.css` - GitHub图标样式
- `lib\highlight.min.js` - 代码高亮库
- `lib\marked.min.js` - Markdown解析库，支持Markdown格式文本

## 技术特性

- 使用Chrome Extension Manifest V3
- 智能文档内容提取和处理
- 支持EventStream流式响应
- 使用Chrome Storage API存储设置
- 现代化的Flex布局UI设计
- 长连接消息通信机制

## 注意事项

1. 确保API密钥的安全性，不要分享给他人
2. 如果遇到跨域问题，请检查API服务器是否支持CORS
3. 某些网页可能会限制内容提取
4. 建议使用支持流式响应的API服务

## 开发计划

- [ ] 添加对话历史记录功能
- [ ] 支持更多AI模型和服务商
- [ ] 优化文档内容提取算法
- [ ] 添加文档摘要功能
- [ ] 支持markdown格式显示
- [ ] 添加快捷键支持

## 贡献指南

欢迎提交Issue和Pull Request来改进这个项目。在提交代码前，请确保：

1. 代码符合项目的编码规范
2. 添加必要的注释和文档
3. 测试过代码的功能

## 许可证

MIT License

## 数据流和逻辑架构

### 1. 组件交互流程

```
[用户界面]
    ↓ 点击扩展图标
[background.js] → [content.js] 
    ↓ 注入UI和脚本
[聊天界面] ← [content.js]
    ↓ 用户输入
[content.js] → [background.js]
    ↓ API请求
[AI服务器] ← → [background.js]
    ↓ 流式响应
[background.js] → [content.js]
    ↓ 渲染响应
[聊天界面]
```

### 2. 详细数据流

#### 初始化流程
1. 用户安装扩展
   - `background.js` 监听 `onInstalled` 事件
   - 初始化默认API设置到 `chrome.storage.sync`

2. 扩展图标点击
   - `background.js` 监听 `action.onClicked` 事件
   - 向当前标签页发送 `toggleChat` 消息

3. UI初始化
   - `content.js` 接收 `toggleChat` 消息
   - 检查并创建聊天界面
   - 加载必要的库（marked.js, highlight.js）
   - 初始化事件监听器

#### 消息处理流程
1. 用户发送消息
   ```javascript
   用户输入 → content.js
   ↓
   提取页面内容
   ↓
   构建消息历史
   ↓
   创建长连接（chrome.runtime.connect）
   ↓
   发送到background.js
   ```

2. API请求处理
   ```javascript
   background.js接收消息
   ↓
   验证API设置
   ↓
   发送fetch请求（流式）
   ↓
   处理响应流
   ↓
   逐块发送到content.js
   ```

3. 响应渲染
   ```javascript
   content.js接收响应块
   ↓
   累积响应内容
   ↓
   解析Markdown
   ↓
   应用语法高亮
   ↓
   更新UI
   ```

### 3. 关键数据结构

#### API设置
```javascript
{
    baseUrl: string,    // API基础URL
    apiKey: string,     // API密钥
    modelName: string   // 模型名称
}
```

#### 消息格式
```javascript
{
    role: "system" | "user" | "assistant",
    content: string
}
```

#### 流式响应格式
```javascript
{
    type: "stream" | "done" | "error",
    content?: string,
    error?: string
}
```

### 4. 错误处理机制

1. API错误
   - 网络请求失败
   - API密钥无效
   - 响应格式错误

2. UI错误
   - Markdown解析失败
   - 代码高亮失败
   - DOM操作异常

3. 通信错误
   - 端口断开
   - 消息发送失败
   - 响应超时

### 5. 安全考虑

1. API密钥保护
   - 存储在chrome.storage中
   - 仅在background.js中使用
   - 日志中隐藏敏感信息

2. 内容安全
   - CSP配置
   - XSS防护
   - 安全的DOM操作
