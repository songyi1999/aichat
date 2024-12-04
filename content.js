let chatContainer = null;
let apiSettings = {
    baseUrl: '',
    apiKey: '',
    modelName: '',
    systemPrompt: ''
};

// 预设问题数组
const presetQuestions = [
    "总结下当前页面内容",
    "这个页面的主要观点是什么",
    "帮我翻译这个页面",
    "解释下这段内容"
];

// 邮件相关的预设问题
const emailPresetQuestions = [
    "帮我回复这封邮件",
    "总结这封邮件的重点",
    "用更专业的语气重写这封邮件",
    "翻译这封邮件",
    "检查邮件的语法和表达"
];

// 检测当前是否在邮件页面
function isEmailPage() {
    const hostname = window.location.hostname;
    return hostname.includes('mail.qq.com') || 
           hostname.includes('mail.163.com') || 
           hostname.includes('mail.126.com') ||
           hostname.includes('outlook') ||
           hostname.includes('mail.google.com');
}

// 获取邮件内容
function getEmailContent() {
    let emailContent = '';
    
    if (window.location.hostname.includes('mail.qq.com')) {
        // QQ邮箱
        const frame = document.querySelector('#mainFrame');
        if (frame && frame.contentDocument) {
            const contentElement = frame.contentDocument.querySelector('#contentDiv');
            if (contentElement) {
                emailContent = contentElement.innerText;
            }
        }
    } else if (window.location.hostname.includes('mail.163.com') || 
               window.location.hostname.includes('mail.126.com')) {
        // 163/126邮箱
        const contentElement = document.querySelector('.netease-mail-content');
        if (contentElement) {
            emailContent = contentElement.innerText;
        }
    } else if (window.location.hostname.includes('outlook')) {
        // Outlook
        const contentElement = document.querySelector('[role="main"]');
        if (contentElement) {
            emailContent = contentElement.innerText;
        }
    }
    
    return emailContent;
}

// 插入AI建议的回复内容
function insertReply(content) {
    if (window.location.hostname.includes('mail.qq.com')) {
        const frame = document.querySelector('#mainFrame');
        if (frame && frame.contentDocument) {
            const editor = frame.contentDocument.querySelector('#QMEditorArea');
            if (editor) {
                editor.innerHTML = content;
            }
        }
    } else if (window.location.hostname.includes('mail.163.com') || 
               window.location.hostname.includes('mail.126.com')) {
        const editor = document.querySelector('.APP-editor-iframe');
        if (editor && editor.contentDocument) {
            editor.contentDocument.body.innerHTML = content;
        }
    } else if (window.location.hostname.includes('outlook')) {
        const editor = document.querySelector('[role="textbox"]');
        if (editor) {
            editor.innerHTML = content;
        }
    }
}

// 初始化设置
function initializeSettings() {
    return new Promise((resolve) => {
        // 获取包含默认值的设置（用于实际操作）
        chrome.runtime.sendMessage({ action: 'getDefaultSettings' }, function(settings) {
            if (settings) {
                apiSettings = settings;
                console.log('[Content] Loaded settings from background');
            }
            resolve();
        });
    });
}

// 等待设置初始化完成后再创建界面
async function createChatInterface() {
    console.log('[Content] Starting to create chat interface');
    try {
        // 如果已经存在，则显示
        if (chatContainer) {
            console.log('[Content] Chat container exists, showing it');
            chatContainer.style.display = 'block';
            return;
        }

        // 创建容器
        chatContainer = document.createElement('div');
        chatContainer.id = 'codeium-chat-container';
        chatContainer.className = 'codeium-chat-container';
        
        // 创建聊天界面HTML
        chatContainer.innerHTML = `
            <div id="codeium-chat-header">
                <span>AI 智能助手</span>
                <div id="codeium-chat-controls">
                    <button id="codeium-chat-settings" title="设置">⚙️</button>
                    <button id="codeium-chat-history-button" title="历史记录">💾</button>
                    <button id="codeium-chat-close" title="关闭">×</button>
                </div>
            </div>
            <div id="codeium-chat-resize-handle"></div>
            <div id="codeium-chat-messages"></div>
            <div id="codeium-chat-preset-questions"></div>
            <div id="codeium-chat-input">
                <textarea id="codeium-chat-input-text" placeholder="输入消息..."></textarea>
                <button id="codeium-chat-send-button" title="发送消息">发送</button>
            </div>
            <div id="codeium-chat-settings-panel" style="display: none;">
                <h3>设置</h3>
                <div class="codeium-settings-group">
                    <label for="codeium-base-url">API地址：</label>
                    <input type="text" id="codeium-base-url" placeholder="输入API地址">
                </div>
                <div class="codeium-settings-group">
                    <label for="codeium-api-key">API密钥：</label>
                    <input type="password" id="codeium-api-key" placeholder="输入API密钥">
                </div>
                <div class="codeium-settings-group">
                    <label for="codeium-model-name">模型名称：</label>
                    <input type="text" id="codeium-model-name" placeholder="输入模型名称">
                </div>
                <div class="codeium-settings-group">
                    <label for="codeium-system-prompt">系统提示语：</label>
                    <textarea id="codeium-system-prompt" placeholder="输入预设的系统提示语，为空则使用默认值"></textarea>
                </div>
                <div class="codeium-settings-buttons">
                    <button id="codeium-save-settings">保存</button>
                    <button id="codeium-close-settings">取消</button>
                </div>
            </div>
        `;

        // 添加样式
        const style = document.createElement('style');
        style.textContent = `
            #codeium-chat-container {
                position: fixed;
                top: 0;
                right: 0;
                width: 400px;
                height: 100vh;
                background: white;
                box-shadow: -2px 0 5px rgba(0,0,0,0.1);
                z-index: 999999;
                display: flex;
                flex-direction: column;
                font-family: Arial, sans-serif;
                min-width: 300px;
                max-width: 800px;
                resize: horizontal;
                overflow: auto;
                color:#000000;
            }

            #codeium-chat-resize-handle {
                position: absolute;
                left: 0;
                top: 0;
                bottom: 0;
                width: 4px;
                background: transparent;
                cursor: ew-resize;
            }

            #codeium-chat-resize-handle:hover {
                background: rgba(0, 123, 255, 0.3);
            }

            #codeium-chat-header {
                padding: 15px;
                background: #f8f9fa;
                border-bottom: 1px solid #dee2e6;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            #codeium-chat-controls {
                display: flex;
                gap: 10px;
            }

            #codeium-chat-controls button {
                background: none;
                border: none;
                cursor: pointer;
                font-size: 16px;
                padding: 5px;
            }

            #codeium-chat-messages {
                flex: 1;
                overflow-y: auto;
                padding: 15px;
            }

            #codeium-chat-input {
                padding: 15px;
                border-top: 1px solid #dee2e6;
                display: flex;
                gap: 10px;
            }

            #codeium-chat-input-text {
                flex: 1;
                padding: 8px;
                border: 1px solid #dee2e6;
                border-radius: 4px;
                resize: none;
                height: 40px;
                font-family: inherit;
            }

            #codeium-chat-send-button {
                padding: 8px 16px;
                background: #007bff;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
            }

            #codeium-chat-send-button:hover {
                background: #0056b3;
            }

            #codeium-chat-send-button:disabled {
                background: #cccccc;
                cursor: not-allowed;
            }

            .codeium-chat-message {
                margin-bottom: 15px;
                padding: 10px;
                border-radius: 8px;
                max-width: 85%;
                display: flex;
                align-items: flex-start;
                gap: 10px;
            }

            .codeium-message-avatar {
                width: 32px;
                height: 32px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 20px;
                flex-shrink: 0;
            }

            .codeium-user-message .codeium-message-avatar {
                background: #007bff;
                color: white;
                order: 2;
            }

            .codeium-ai-message .codeium-message-avatar {
                background: #f8f9fa;
                border: 1px solid #dee2e6;
                color: #28a745;
            }

            .codeium-message-content {
                flex: 1;
            }

            .codeium-user-message {
                margin-left: auto;
                flex-direction: row-reverse;
            }

            .codeium-user-message .codeium-message-content {
                background: #007bff;
                color: white;
                padding: 10px;
                border-radius: 8px;
            }

            .codeium-ai-message {
                margin-right: auto;
            }

            .codeium-ai-message .codeium-message-content {
                background: #f8f9fa;
                border: 1px solid #dee2e6;
                padding: 10px;
                border-radius: 8px;
            }

            .codeium-chat-message .codeium-message-content pre {
                background: #f6f8fa;
                padding: 10px;
                border-radius: 4px;
                overflow-x: auto;
            }

            .codeium-chat-message .codeium-message-content code {
                font-family: 'Consolas', 'Monaco', monospace;
                font-size: 0.9em;
            }

            .codeium-user-message .codeium-message-content pre,
            .codeium-user-message .codeium-message-content code {
                background: rgba(255, 255, 255, 0.1) !important;
                color: white !important;
            }

            .codeium-ai-message .codeium-message-content pre {
                border: 1px solid #e1e4e8;
            }

            #codeium-chat-settings-panel {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: white;
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                z-index: 1000000;
                width: 80%; /* 修改宽度为90% */
                max-height: 90vh;
                overflow-y: auto;
            }

            .codeium-settings-group {
                margin-bottom: 15px;
            }

            .codeium-settings-group label {
                display: block;
                margin-bottom: 5px;
            }

            .codeium-settings-group input {
                width: 100%;
                padding: 8px;
                border: 1px solid #dee2e6;
                border-radius: 4px;
            }

            .codeium-settings-group textarea {
                width: 100%;
                padding: 8px;
                border: 1px solid #dee2e6;
                border-radius: 4px;
                resize: vertical;
            }

            .codeium-settings-buttons {
                display: flex;
                justify-content: flex-end;
                gap: 10px;
                margin-top: 20px;
            }

            .codeium-settings-buttons button {
                padding: 8px 16px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
            }

            #codeium-save-settings {
                background: #28a745;
                color: white;
            }

            #codeium-close-settings {
                background: #dc3545;
                color: white;
            }

            #codeium-chat-preset-questions {
                padding: 10px;
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
            }

            .preset-question-link {
                display: inline-block;
                padding: 4px 8px;
                background-color: #f0f0f0;
                border-radius: 12px;
                font-size: 12px;
                color: #333;
                text-decoration: none;
                cursor: pointer;
            }

            .preset-question-link:hover {
                background-color: #e0e0e0;
            }
        `;

        // 添加到页面
        document.head.appendChild(style);
        document.body.appendChild(chatContainer);
        console.log('[Content] Chat container and styles added to page');

        // 添加拖动调整大小功能
        const resizeHandle = document.getElementById('codeium-chat-resize-handle');
        let isResizing = false;
        let startX, startWidth;

        resizeHandle.addEventListener('mousedown', (e) => {
            isResizing = true;
            startX = e.clientX;
            startWidth = parseInt(document.defaultView.getComputedStyle(chatContainer).width, 10);
            
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', () => {
                isResizing = false;
                document.removeEventListener('mousemove', handleMouseMove);
            });
        });

        function handleMouseMove(e) {
            if (!isResizing) return;
            const width = startWidth - (e.clientX - startX);
            if (width >= 300 && width <= 800) {
                chatContainer.style.width = width + 'px';
            }
        }

        // 立即设置事件监听器
        console.log('[Content] Setting up event listeners');
        const input = document.getElementById('codeium-chat-input-text');
        const sendButton = document.getElementById('codeium-chat-send-button');
        const closeButton = document.getElementById('codeium-chat-close');
        const settingsButton = document.getElementById('codeium-chat-settings');
        const historyButton = document.getElementById('codeium-chat-history-button');
        const settingsPanel = document.getElementById('codeium-chat-settings-panel');
        const saveSettingsButton = document.getElementById('codeium-save-settings');
        const closeSettingsButton = document.getElementById('codeium-close-settings');

        // 发送消息处理函数
        async function handleSendMessage(event) {
            console.log('[Content] Send button clicked');
            event.preventDefault();
            const input = document.getElementById('codeium-chat-input-text');
            if (!input || !input.value.trim()) return;

            // 检查并确保库已加载
            const librariesLoaded = await checkAndLoadLibraries();
            if (!librariesLoaded) {
                console.error('[Content] Cannot send message: Libraries not loaded');
                return;
            }

            const message = input.value.trim();
            if (message) {
                console.log('[Content] Sending message:', message);
                input.value = '';
                input.disabled = true;
                sendButton.disabled = true;
                
                sendMessage(message).finally(() => {
                    input.disabled = false;
                    sendButton.disabled = false;
                    input.focus();
                });
            }
        }

        // 设置事件监听器
        sendButton.onclick = handleSendMessage;
        input.onkeypress = (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage(new Event('click'));
            }
        };

        if (closeButton) {
            closeButton.onclick = () => {
                console.log('[Content] Close button clicked');
                chatContainer.style.display = 'none';
            };
        }

        if (settingsButton && settingsPanel) {
            settingsButton.onclick = () => {
                console.log('[Content] Settings button clicked');
                settingsPanel.style.display = 'block';
                loadSettingsIntoPanel();
            };
        }

        if (historyButton) {
            historyButton.onclick = () => {
                console.log('[Content] History button clicked');
                showHistoryPanel();
            };
        }

        if (saveSettingsButton) {
            saveSettingsButton.onclick = handleSettingsSave;
        }

        if (closeSettingsButton) {
            closeSettingsButton.onclick = () => {
                console.log('[Content] Close settings button clicked');
                settingsPanel.style.display = 'none';
            };
        }

        // 添加预设问题
        const presetQuestionsContainer = document.getElementById('codeium-chat-preset-questions');
        if (isEmailPage()) {
            presetQuestions.push(...emailPresetQuestions);
        }
        presetQuestions.forEach(question => {
            const link = document.createElement('a');
            link.className = 'preset-question-link';
            link.textContent = question;
            link.onclick = () => {
                const inputText = document.getElementById('codeium-chat-input-text');
                inputText.value = question;
                document.getElementById('codeium-chat-send-button').click();
            };
            presetQuestionsContainer.appendChild(link);
        });

        // 初始化欢迎消息
        const welcomeMessage = "👋 你好！我是AI助手，很高兴为你服务。你可以直接提问，或者点击下方的预设问题开始对话。";
        addMessage('assistant', welcomeMessage);

        console.log('[Content] Chat interface creation completed');
    } catch (error) {
        console.error('[Content] Error creating chat interface:', error);
    }
}

async  function delay (ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// 加载外部库
async function loadExternalLibraries() {
    console.log('[Content] Starting to load external libraries');
    try {
        // 加载 highlight.js CSS
        const highlightCSS = document.createElement('link');
        highlightCSS.rel = 'stylesheet';
        highlightCSS.href = chrome.runtime.getURL('lib/github.min.css');
        document.head.appendChild(highlightCSS);
        console.log('[Content] Added stylesheet:', highlightCSS.href);

        // 加载 marked.js
        window.marked = await import(chrome.runtime.getURL('lib/marked.esm.js')).then(module => module.marked);
        console.log('[Content] marked.js loaded');

        // 加载 highlight.js
        window.hljs = await import(chrome.runtime.getURL('lib/highlight.min.js')).then(module => module.default);
        console.log('[Content] highlight.js loaded');

        return true;
    } catch (error) {
        console.error('[Content] Error loading libraries:', error);
        return false;
    }
}

// 检查库是否已加载
async function checkAndLoadLibraries() {
    if (!window.marked || !window.hljs) {
        console.log('[Content] Libraries missing, reloading...');
        try {
            await loadExternalLibraries();
            console.log('[Content] Libraries reloaded successfully');
            return true;
        } catch (error) {
            console.error('[Content] Failed to reload libraries:', error);
            return false;
        }
    }
    return true;
}

// 发送消息到AI
async function sendMessage(message) {
    console.log('[Content] Starting sendMessage with:', message);
    
    const input = document.getElementById('codeium-chat-input-text');
    const sendButton = document.getElementById('codeium-chat-send-button');
    
    // 禁用输入和发送按钮
    input.disabled = true;
    sendButton.disabled = true;

    try {
        // Save user message to history
        await chatHistoryManager.addChat(message, 'user', window.location.href);
        
        console.log('[Content] Adding user message to UI');
        // 添加用户消息
        addMessage('user', message);

        console.log('[Content] Getting page content');
        // 获取页面内容
        const pageContent = getPageContent();
        console.log('[Content] Page content length:', pageContent.length);

        // 准备消息历史
        const messages = [
            {
                role: "system",
                content: apiSettings.systemPrompt 
                    ? apiSettings.systemPrompt + "\n\n当前网页的内容：\n" + pageContent
                    : "你是一个helpful的AI助手。以下是当前网页的内容：\n\n" + pageContent
            },
            {
                role: "user",
                content: message
            }
        ];
        console.log('[Content] Prepared messages:', messages);

        console.log('[Content] Adding empty AI message to UI');
        // 创建一个空的AI消息
        addMessage('AI', '');

        console.log('[Content] Creating port connection');
        // 创建一个端口连接
        const port = chrome.runtime.connect({ name: 'ai-chat' });
        console.log('[Content] Port connection created');

        let currentContent = '';

        // 监听来自background的消息
        port.onMessage.addListener(function(response) {
            console.log('[Content] Received message from background:', response);
            
            if (response.error) {
                console.error('[Content] Error from background:', response.error);
                addMessage('system', `Error: ${response.error}`);
                return;
            }

            if (response.type === 'stream') {
                console.log('[Content] Received stream chunk:', response.content);
                // 追加新内容
                currentContent += response.content;
                
                // 更新最后一条AI消息
                const messagesContainer = document.getElementById('codeium-chat-messages');
                const lastMessage = messagesContainer.lastElementChild;
                if (lastMessage && lastMessage.classList.contains('codeium-ai-message')) {
                    const contentDiv = lastMessage.querySelector('.codeium-message-content');
                    try {
                        console.log('[Content] Parsing markdown');
                        contentDiv.innerHTML = marked.parse(currentContent);
                        // 处理代码高亮
                        const codeBlocks = contentDiv.querySelectorAll('pre code');
                        if (codeBlocks.length > 0) {
                            try {
                                codeBlocks.forEach(block => {
                                    if (window.hljs) {
                                        // 使用新版本的highlight方法
                                        window.hljs.highlightElement(block);
                                    }
                                });
                            } catch (error) {
                                console.error('[Content] Error highlighting code:', error);
                            }
                        }
                    } catch (error) {
                        console.error('Error parsing markdown:', error);
                        contentDiv.textContent = currentContent;
                    }
                    messagesContainer.scrollTop = messagesContainer.scrollHeight;
                }
            } else if (response.type === 'done') {
                // Save AI response to history
                chatHistoryManager.addChat(currentContent, 'AI', window.location.href);
                console.log('[Content] Stream completed, disconnecting port');
                port.disconnect();
            }
        });

        console.log('[Content] Sending message to background');
        // 发送消息到background
        port.postMessage({
            action: 'makeApiRequest',
            data: {
                baseUrl: apiSettings.baseUrl,
                apiKey: apiSettings.apiKey,
                modelName: apiSettings.modelName,
                messages: messages
            }
        });
        console.log('[Content] Message sent to background');

        // 如果是邮件相关的请求，添加邮件内容到上下文
        if (isEmailPage() && message.includes('邮件')) {
            const emailContent = getEmailContent();
            message = `上下文：以下是邮件内容：\n${emailContent}\n\n用户请求：${message}`;
        }

        // 如果是请求回复邮件，将AI回复插入到编辑器
        // 移除这里的直接插入代码，因为响应还未完成
        // if (message.includes('回复这封邮件') || message.includes('重写这封邮件')) {
        //     insertReply(response);
        // }
    } catch (error) {
        console.error('[Content] Error in sendMessage:', error);
        addMessage('system', `Error: ${error.message}`);
    } finally {
        console.log('[Content] Re-enabling input and send button');
        // 重新启用输入和发送按钮
        input.disabled = false;
        sendButton.disabled = false;
    }
}

// 获取页面主要内容
function getPageContent() {
    // 获取页面标题
    const title = document.title;

    // 获取主要内容
    // 1. 首先尝试获取article标签
    let content = '';
    const article = document.querySelector('article');
    if (article) {
        content = article.textContent;
    } else {
        // 2. 如果没有article标签，尝试获取main标签
        const main = document.querySelector('main');
        if (main) {
            content = main.textContent;
        } else {
            // 3. 如果都没有，获取body中除了我们自己创建的聊天界面外的所有文本内容
            const fullText = document.body.innerText;
            const separator = "AI 智能助手\n⚙️";
            const parts = fullText.split(separator);
            
            // 获取分隔符左边的内容（原始页面内容）
            content = parts[0] || '';
            
            // 如果没有找到分隔符，使用完整内容
            if (parts.length === 1) {
                console.log('[Content] Separator not found, using full content');
            } else {
                console.log('[Content] Content split successfully');
            }
        }
    }

    // 清理内容
    content = content
        .replace(/\s+/g, ' ')  // 将多个空白字符替换为单个空格
        .trim();               // 移除首尾空白

    // 构建完整内容
    const fullContent = `
标题：${title}

内容：
${content}
`;

    // 限制内容长度（避免超过API限制）
    const maxLength = 60000; // 60k
    if (fullContent.length > maxLength) {
        return fullContent.substring(0, maxLength) + '...（内容已截断）';
    }

    return fullContent;
}

// 添加消息到聊天界面
async  function addMessage(sender, content) {
    console.log('[Content] Adding message from:', sender);
    const messagesContainer = document.getElementById('codeium-chat-messages');
    if (!messagesContainer) {
        console.error('[Content] Messages container not found');
        return;
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = `codeium-chat-message codeium-${sender.toLowerCase()}-message`;
    
    // 创建头像
    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'codeium-message-avatar';
    avatarDiv.textContent = sender === 'AI' ? '🤖' : '👤';
    messageDiv.appendChild(avatarDiv);
    
    // 创建内容div
    const contentDiv = document.createElement('div');
    contentDiv.className = 'codeium-message-content';
    messageDiv.appendChild(contentDiv);
    
    // 使用marked.js处理Markdown
    try {
        // 确保marked和hljs已经加载
       
       const librariesLoaded = await checkAndLoadLibraries();
       if (!librariesLoaded) {
           console.error('[Content] Cannot render message: Libraries not loaded');
           return;
       }

        // 配置marked使用highlight.js
        window.marked.setOptions({
            highlight: function(code, lang) {
                if (lang && window.hljs.getLanguage(lang)) {
                    return window.hljs.highlight(code, { language: lang }).value;
                }
                return window.hljs.highlightAuto(code).value;
            }
        });

        const htmlContent = window.marked.parse(content);
        contentDiv.innerHTML = htmlContent;
    } catch (error) {
        console.error('[Content] Error parsing markdown:', error);
        contentDiv.textContent = content;
    }

    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// 监听来自background的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'toggleChat') {
        createChatInterface();
    }
});

let currentAIMessage = null;

async function handleStreamMessage(message, isFirstChunk = false, isDone = false) {
    try {
        // 确保库已加载
        const librariesLoaded = await checkAndLoadLibraries();
        if (!librariesLoaded) {
            console.error('[Content] Cannot render message: Libraries not loaded');
            return;
        }

        console.log('[Content] Handling stream message:', { isFirstChunk, isDone });
        
        const messagesContainer = document.getElementById('codeium-chat-messages');
        if (!messagesContainer) {
            console.error('[Content] Messages container not found');
            return;
        }

        // 如果是新消息，创建新的消息元素
        if (!currentAIMessage) {
            currentAIMessage = document.createElement('div');
            currentAIMessage.className = 'codeium-chat-message codeium-ai-message';
            const contentDiv = document.createElement('div');
            contentDiv.className = 'codeium-message-content';
            currentAIMessage.appendChild(contentDiv);
            messagesContainer.appendChild(currentAIMessage);
        }

        // 获取或创建内容div
        const contentDiv = currentAIMessage.querySelector('.codeium-message-content');
        if (!contentDiv) {
            console.error('[Content] Content div not found');
            return;
        }

        // 累积消息内容
        contentDiv.textContent = (contentDiv.textContent || '') + message;

        // 滚动到底部
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    } catch (error) {
        console.error('[Content] Error handling stream message:', error);
    }
}

function handleStreamComplete() {
    console.log('[Content] Stream completed');
    if (currentAIMessage) {
        const contentDiv = currentAIMessage.querySelector('.codeium-message-content');
        if (contentDiv) {
            console.log('[Content] Parsing markdown');
            try {
                // 确保marked和hljs已经加载
                if (!window.marked || !window.hljs) {
                    throw new Error('Libraries not loaded');
                }

                // 配置marked使用highlight.js
                window.marked.setOptions({
                    highlight: function(code, lang) {
                        if (lang && window.hljs.getLanguage(lang)) {
                            return window.hljs.highlight(code, { language: lang }).value;
                        }
                        return window.hljs.highlightAuto(code).value;
                    }
                });

                const markdown = contentDiv.textContent || '';
                const htmlContent = window.marked.parse(markdown);
                contentDiv.innerHTML = htmlContent;
            } catch (error) {
                console.error('[Content] Error parsing markdown:', error);
                // 保持原始文本
            }
        }
        currentAIMessage = null;
    }
}

function handleBackgroundMessage(message) {
    console.log('[Content] Received message from background:', message);
    
    if (message.type === 'stream') {
        handleStreamMessage(message.content);
    } else if (message.type === 'streamComplete') {
        handleStreamComplete();
        console.log('[Content] Stream completed, disconnecting port');
        if (port) {
            port.disconnect();
            port = null;
        }
    }
}

// 修改加载设置到面板的函数
function loadSettingsIntoPanel() {
    console.log('[Content] Loading settings into panel');
    const baseUrlInput = document.getElementById('codeium-base-url');
    const apiKeyInput = document.getElementById('codeium-api-key');
    const modelNameInput = document.getElementById('codeium-model-name');
    const systemPromptInput = document.getElementById('codeium-system-prompt');

    if (baseUrlInput && apiKeyInput && modelNameInput && systemPromptInput) {
        // 获取已保存的设置（不包含默认值）
        chrome.runtime.sendMessage({ action: 'getSettings' }, function(settings) {
            // 设置输入框的值，使用空字符串作为默认值
            baseUrlInput.value = settings.baseUrl || '';
            apiKeyInput.value = settings.apiKey || '';
            modelNameInput.value = settings.modelName || '';
            systemPromptInput.value = settings.systemPrompt || '';
            console.log('[Content] Settings loaded into panel');
        });
    } else {
        console.error('[Content] Settings panel elements not found');
    }
}

let currentStreamResponse = ''; // 添加变量存储完整的流式响应

// 处理流式消息
function handleStreamMessage(message, isFirstChunk = false, isDone = false) {
    if (isFirstChunk) {
        currentStreamResponse = ''; // 重置响应内容
    }
    
    if (message) {
        currentStreamResponse += message; // 累积响应内容
        const messageElement = document.querySelector('.message-content.loading');
        if (messageElement) {
            messageElement.innerHTML = marked.parse(currentStreamResponse);
            messageElement.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
    }

    if (isDone) {
        const messageElement = document.querySelector('.message-content.loading');
        if (messageElement) {
            messageElement.classList.remove('loading');
        }
        
        // 检查是否需要插入邮件回复
        const lastUserMessage = document.querySelector('.message.user:last-child .message-content');
        if (lastUserMessage && 
            (lastUserMessage.textContent.includes('回复这封邮件') || 
             lastUserMessage.textContent.includes('重写这封邮件'))) {
            insertReply(currentStreamResponse);
        }
    }
}

// 修改发送消息函数
async function sendMessage(message) {
    console.log('[Content] Starting sendMessage with:', message);
    
    const input = document.getElementById('codeium-chat-input-text');
    const sendButton = document.getElementById('codeium-chat-send-button');
    
    // 禁用输入和发送按钮
    input.disabled = true;
    sendButton.disabled = true;

    try {
        // Save user message to history
        await chatHistoryManager.addChat(message, 'user', window.location.href);
        
        console.log('[Content] Adding user message to UI');
        // 添加用户消息
        addMessage('user', message);

        console.log('[Content] Getting page content');
        // 获取页面内容
        const pageContent = getPageContent();
        console.log('[Content] Page content length:', pageContent.length);

        // 准备消息历史
        const messages = [
            {
                role: "system",
                content: apiSettings.systemPrompt 
                    ? apiSettings.systemPrompt + "\n\n当前网页的内容：\n" + pageContent
                    : "你是一个helpful的AI助手。以下是当前网页的内容：\n\n" + pageContent
            },
            {
                role: "user",
                content: message
            }
        ];
        console.log('[Content] Prepared messages:', messages);

        console.log('[Content] Adding empty AI message to UI');
        // 创建一个空的AI消息
        addMessage('AI', '');

        console.log('[Content] Creating port connection');
        // 创建一个端口连接
        const port = chrome.runtime.connect({ name: 'ai-chat' });
        console.log('[Content] Port connection created');

        let currentContent = '';

        // 监听来自background的消息
        port.onMessage.addListener(function(response) {
            console.log('[Content] Received message from background:', response);
            
            if (response.error) {
                console.error('[Content] Error from background:', response.error);
                addMessage('system', `Error: ${response.error}`);
                return;
            }

            if (response.type === 'stream') {
                console.log('[Content] Received stream chunk:', response.content);
                // 追加新内容
                currentContent += response.content;
                
                // 更新最后一条AI消息
                const messagesContainer = document.getElementById('codeium-chat-messages');
                const lastMessage = messagesContainer.lastElementChild;
                if (lastMessage && lastMessage.classList.contains('codeium-ai-message')) {
                    const contentDiv = lastMessage.querySelector('.codeium-message-content');
                    try {
                        console.log('[Content] Parsing markdown');
                        contentDiv.innerHTML = marked.parse(currentContent);
                        // 处理代码高亮
                        const codeBlocks = contentDiv.querySelectorAll('pre code');
                        if (codeBlocks.length > 0) {
                            try {
                                codeBlocks.forEach(block => {
                                    if (window.hljs) {
                                        // 使用新版本的highlight方法
                                        window.hljs.highlightElement(block);
                                    }
                                });
                            } catch (error) {
                                console.error('[Content] Error highlighting code:', error);
                            }
                        }
                    } catch (error) {
                        console.error('Error parsing markdown:', error);
                        contentDiv.textContent = currentContent;
                    }
                    messagesContainer.scrollTop = messagesContainer.scrollHeight;
                }
            } else if (response.type === 'done') {
                // Save AI response to history
                chatHistoryManager.addChat(currentContent, 'AI', window.location.href);
                console.log('[Content] Stream completed, disconnecting port');
                port.disconnect();
            }
        });

        console.log('[Content] Sending message to background');
        // 发送消息到background
        port.postMessage({
            action: 'makeApiRequest',
            data: {
                baseUrl: apiSettings.baseUrl,
                apiKey: apiSettings.apiKey,
                modelName: apiSettings.modelName,
                messages: messages
            }
        });
        console.log('[Content] Message sent to background');

        // 如果是邮件相关的请求，添加邮件内容到上下文
        if (isEmailPage() && message.includes('邮件')) {
            const emailContent = getEmailContent();
            message = `上下文：以下是邮件内容：\n${emailContent}\n\n用户请求：${message}`;
        }

        // 移除这里的直接插入代码，因为响应还未完成
        // if (message.includes('回复这封邮件') || message.includes('重写这封邮件')) {
        //     insertReply(response);
        // }
    } catch (error) {
        console.error('[Content] Error in sendMessage:', error);
        addMessage('system', `Error: ${error.message}`);
    } finally {
        console.log('[Content] Re-enabling input and send button');
        // 重新启用输入和发送按钮
        input.disabled = false;
        sendButton.disabled = false;
    }
}

// 修改设置面板相关代码，确保能正确显示已保存的系统提示语并在保存后关闭面板
function loadSettingsIntoPanel() {
    console.log('[Content] Loading settings into panel');
    const baseUrlInput = document.getElementById('codeium-base-url');
    const apiKeyInput = document.getElementById('codeium-api-key');
    const modelNameInput = document.getElementById('codeium-model-name');
    const systemPromptInput = document.getElementById('codeium-system-prompt');

    if (baseUrlInput && apiKeyInput && modelNameInput && systemPromptInput) {
        chrome.runtime.sendMessage({ action: 'getSettings' }, function(settings) {
            if (settings) {
                baseUrlInput.value = settings.baseUrl || '';
                apiKeyInput.value = settings.apiKey || '';
                modelNameInput.value = settings.modelName || '';
                systemPromptInput.value = settings.systemPrompt || '';
                console.log('[Content] Settings loaded into panel');
            }
        });
    } else {
        console.error('[Content] Settings panel elements not found');
    }
}

function handleSettingsSave() {
    const newSettings = {
        baseUrl: document.getElementById('codeium-base-url').value.trim(),
        apiKey: document.getElementById('codeium-api-key').value.trim(),
        modelName: document.getElementById('codeium-model-name').value.trim(),
        systemPrompt: document.getElementById('codeium-system-prompt').value.trim()
    };

    // 检查是否有任何设置需要保存
    const hasApiSettings = newSettings.baseUrl || newSettings.apiKey || newSettings.modelName;
    const hasSystemPrompt = newSettings.systemPrompt !== undefined;

    if (!hasApiSettings && !hasSystemPrompt) {
        console.log('[Content] No settings to save');
        return;
    }

    // 验证API设置的完整性
    if (hasApiSettings && (!newSettings.baseUrl || !newSettings.apiKey || !newSettings.modelName)) {
        alert('如果要保存API设置，请填写完整的Base URL、API Key和Model Name');
        return;
    }

    // 发送保存请求
    chrome.runtime.sendMessage({
        action: 'saveSettings',
        settings: newSettings
    }, function(response) {
        if (response.success) {
            // 更新全局设置
            if (hasApiSettings) {
                apiSettings.baseUrl = newSettings.baseUrl;
                apiSettings.apiKey = newSettings.apiKey;
                apiSettings.modelName = newSettings.modelName;
            }
            if (hasSystemPrompt) {
                apiSettings.systemPrompt = newSettings.systemPrompt;
            }
            
            // 关闭设置面板
            const settingsPanel = document.getElementById('codeium-chat-settings-panel');
            if (settingsPanel) {
                settingsPanel.style.display = 'none';
            }
            
            console.log('[Content] Settings saved successfully');
        }
    });
}

// document.getElementById('codeium-save-settings').onclick = handleSettingsSave;

// Add history panel UI and functions
function createHistoryPanel() {
    const panel = document.createElement('div');
    panel.id = 'codeium-chat-history-panel';
    panel.className = 'codeium-panel';
    panel.style.display = 'none';
    
    panel.innerHTML = `
        <div class="codeium-history-header">
            <h3>聊天记录</h3>
            <div class="codeium-history-actions">
                <button id="codeium-export-json">导出JSON</button>
                <button id="codeium-export-csv">导出CSV</button>
                <button id="codeium-delete-selected">删除选中</button>
                <button id="codeium-close-history">关闭</button>
            </div>
        </div>
        <div class="codeium-history-list"></div>
    `;
    
    document.body.appendChild(panel);
    
    // Add event listeners
    document.getElementById('codeium-export-json').onclick = () => exportHistory('json');
    document.getElementById('codeium-export-csv').onclick = () => exportHistory('csv');
    document.getElementById('codeium-delete-selected').onclick = deleteSelectedChats;
    document.getElementById('codeium-close-history').onclick = () => panel.style.display = 'none';
    
    return panel;
}

async function showHistoryPanel() {
    const panel = document.getElementById('codeium-chat-history-panel') || createHistoryPanel();
    panel.style.display = 'block';
    
    // Load and display history
    const history = await chatHistoryManager.getHistory();
    const listContainer = panel.querySelector('.codeium-history-list');
    listContainer.innerHTML = '';
    
    history.forEach(chat => {
        const chatElement = document.createElement('div');
        chatElement.className = 'codeium-history-item';
        chatElement.innerHTML = `
            <input type="checkbox" data-timestamp="${chat.timestamp}">
            <div class="codeium-history-content">
                <div class="codeium-history-meta">
                    <span>${new Date(chat.timestamp).toLocaleString()}</span>
                    <span>${chat.role}</span>
                    <a href="${chat.url}" target="_blank">🔗</a>
                </div>
                <div class="codeium-history-text">${chat.content}</div>
            </div>
        `;
        listContainer.appendChild(chatElement);
    });
}

async function exportHistory(format) {
    const content = await chatHistoryManager.exportHistory(format);
    // Send message to background script to handle download
    chrome.runtime.sendMessage({
        action: 'downloadFile',
        data: {
            url: URL.createObjectURL(new Blob([content], { type: format === 'json' ? 'application/json' : 'text/csv' })),
            filename: `chat-history.${format}`
        }
    });
}

async function deleteSelectedChats() {
    const selected = Array.from(document.querySelectorAll('#codeium-chat-history-panel input[type="checkbox"]:checked'))
        .map(checkbox => checkbox.dataset.timestamp);
    
    if (selected.length === 0) return;
    
    if (confirm(`确定要删除选中的 ${selected.length} 条记录吗？`)) {
        await chatHistoryManager.deleteChats(selected);
        showHistoryPanel(); // Refresh the panel
    }
}

// Add styles for history panel
const historyStyles = `
    #codeium-chat-history-panel {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 80%;
        max-width: 800px;
        max-height: 80vh;
        background: white;
        border: 1px solid #ccc;
        border-radius: 8px;
        padding: 20px;
        z-index: 10000;
        overflow-y: auto;
    }
    
    .codeium-history-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
    }
    
    .codeium-history-actions {
        display: flex;
        gap: 10px;
    }
    
    .codeium-history-item {
        display: flex;
        gap: 10px;
        padding: 10px;
        border-bottom: 1px solid #eee;
    }
    
    .codeium-history-content {
        flex: 1;
    }
    
    .codeium-history-meta {
        display: flex;
        gap: 10px;
        color: #666;
        font-size: 0.9em;
        margin-bottom: 5px;
    }
    
    .codeium-history-text {
        white-space: pre-wrap;
    }
`;

// Add styles to the page
const styleSheet = document.createElement('style');
styleSheet.textContent = historyStyles;
document.head.appendChild(styleSheet);
