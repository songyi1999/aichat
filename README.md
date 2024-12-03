# AI Chat Browser Extension

## 产品用途
这是一个AI驱动的网页助手扩展，为用户提供即时的智能对话服务。用户可以在任何网页上通过右侧边栏与AI助手进行对话，获取信息解答和帮助。扩展程序专注于提供流畅的AI对话体验，支持Markdown格式和代码高亮显示，让用户可以随时获得AI的智能协助。

一个强大的Chrome浏览器扩展，支持智能文档对话。可以自动读取当前页面内容，让你直接与文档进行对话，获取相关信息和解答。

## 功能特点

- 智能文档对话 - 自动提取当前页面内容，实现与文档的智能交互
- 上下文理解 - AI助手能理解页面内容，提供准确的回答
- 快速访问 - 点击浏览器工具栏图标即可打开聊天界面
- 实时对话 - 支持流式响应，实现即时对话体验
- 美观界面 - 现代化的聊天界面设计，支持拖拽调整大小
- 灵活配置 - 可自定义API设置，支持多种AI服务提供商
- 安全可靠 - 本地存储API密钥，确保安全性
- Markdown支持 - 完整支持Markdown格式和代码高亮显示

## 预设功能
- 总结网页内容
- 提取页面主要观点
- 翻译页面内容
- 解释专业术语
- 智能邮件回复
- 邮件重写优化
- 邮件翻译

## 功能列表和状态

### 已实现功能 
1. **基础界面**
   - 可调整大小的右侧面板 (300px-800px)
   - 可拖动的左边框
   - 深色文字显示 (#000000)
   - AI和用户头像显示（/）
   - 响应式设计

2. **聊天功能**
   - Markdown 渲染支持
   - 代码语法高亮
   - 消息流式响应
   - 中文界面支持

3. **设置功能**
   - API设置面板
   - 设置的本地存储
   - API密钥管理

4. **技术特性**
   - ES模块动态导入
   - 样式隔离（codeium-前缀）
   - 错误处理和日志
   - 库文件动态加载

### 待实现功能 
1. **增强功能**
   - 对话历史记录
   - 更多AI模型集成
   - 文档内容智能提取
   - 键盘快捷键
   - 主题切换
   - 消息引用和编辑

2. **性能优化**
   - 流式响应性能优化
   - 内存使用优化
   - 加载速度优化

3. **用户体验**
   - 更多自定义选项
   - 多语言支持
   - 导出对话功能

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
5. 可以通过拖拽左侧边框来调整聊天窗口的宽度

## 界面特性

- 可调整大小 - 拖拽左侧边框可以调整聊天窗口宽度（300px-800px）
- 实时响应 - 支持流式输出，打字机效果
- 代码高亮 - 自动识别和高亮显示代码块
- Markdown渲染 - 支持完整的Markdown语法
- 响应式设计 - 自适应不同屏幕尺寸

## 权限说明

### scripting
用于在网页中注入和执行必要的JavaScript代码，实现AI聊天界面的动态创建和交互功能：
- 动态创建和管理聊天界面元素
- 处理用户输入和AI响应
- 实现Markdown渲染和代码高亮显示

### 主机权限 (<all_urls>)
需要在任何网页上提供服务：
- 随时访问AI聊天助手
- 获取当前页面的上下文信息
- 在任何网页中使用AI辅助功能
注：我们严格限制了数据访问范围，只读取用户主动选择分享的内容。

### activeTab
用于实现与当前活动标签页的安全交互：
- 仅在用户主动使用扩展时访问当前页面
- 获取必要的页面信息用于AI上下文理解
- 确保扩展只在用户需要时才能访问页面内容

### storage
用于安全存储用户的设置和偏好：
- 保存API配置信息（如API地址）
- 存储用户界面偏好设置
- 缓存聊天记录（计划功能）
这些数据存储在用户的浏览器本地，不会上传到云端，确保用户数据的隐私和安全。

## 文件结构

### 项目结构
```
├── manifest.json      # 扩展配置文件
├── background.js      # 后台服务
├── content.js         # 主要交互逻辑和样式
└── lib/              # 外部库
    ├── marked.esm.js  # Markdown解析（ES模块版本）
    ├── highlight.min.js
    └── github.min.css
```

## 技术特性

- 使用Chrome Extension Manifest V3
- ES模块动态导入支持
- 智能文档内容提取和处理
- 支持EventStream流式响应
- 使用Chrome Storage API存储设置
- 现代化的Flex布局UI设计
- 长连接消息通信机制
- 完整的Markdown和代码高亮支持

## 注意事项

1. 确保API密钥的安全性，不要分享给他人
2. 如果遇到跨域问题，请检查API服务器是否支持CORS
3. 某些网页可能会限制内容提取
4. 建议使用支持流式响应的API服务

## 最新更新

- 添加窗口大小调整功能
- 改进Markdown渲染和代码高亮
- 支持中文界面
- 优化响应式布局
- 改进流式响应的显示效果
- 使用ES模块加载外部库

## 开发计划

- [ ] 添加对话历史记录功能
- [ ] 多语言支持
- [ ] 个性化长期记忆功能
- [ ] 添加工具调用功能
- [ ] 添加快捷键支持
- [ ] 支持主题切换
- [ ] 添加针对特定网站自定义引导词

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

## 开发指南

### 项目结构
```
├── manifest.json      # 扩展配置文件
├── background.js      # 后台服务
├── content.js         # 主要交互逻辑和样式
└── lib/              # 外部库
    ├── marked.esm.js  # Markdown解析（ES模块版本）
    ├── highlight.min.js
    └── github.min.css
```

### 开发注意事项
1. 所有CSS选择器必须使用`codeium-`前缀
2. 新功能开发前检查功能列表确保兼容性
3. 遵循Chrome Extension Manifest V3规范
4. 保持代码模块化和可维护性

### 安全考虑
- API密钥安全存储
- 内容安全策略
- 输入验证和消毒
- 最小权限原则

## 更新日志

### 2023-12-XX
- 添加用户和AI头像显示
- 优化消息样式
- 添加深色文字显示
- 更新功能列表文档

{{ ... }}
