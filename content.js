let chatContainer = null;
let apiSettings = {
    baseUrl: '',
    apiKey: '',
    modelName: ''
};

// 初始化设置
function initializeSettings() {
    return new Promise((resolve) => {
        chrome.storage.sync.get(['apiSettings'], function(result) {
            if (result.apiSettings) {
                apiSettings = result.apiSettings;
                console.log('Loaded stored settings');
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
        chatContainer.id = 'ai-chat-container';
        chatContainer.className = 'ai-chat-container';
        
        // 创建聊天界面HTML
        chatContainer.innerHTML = `
            <div id="ai-chat-header">
                <span>AI Chat</span>
                <div id="ai-chat-controls">
                    <button id="ai-chat-settings" title="Settings">⚙️</button>
                    <button id="ai-chat-close" title="Close">×</button>
                </div>
            </div>
            <div id="ai-chat-messages"></div>
            <div id="ai-chat-input">
                <textarea id="ai-chat-input-text" placeholder="Type your message..."></textarea>
                <button id="ai-chat-send-button" title="Send message">Send</button>
            </div>
            <div id="ai-chat-settings-panel" style="display: none;">
                <h3>Settings</h3>
                <div class="settings-group">
                    <label for="ai-base-url">Base URL:</label>
                    <input type="text" id="ai-base-url" placeholder="Enter API base URL">
                </div>
                <div class="settings-group">
                    <label for="ai-api-key">API Key:</label>
                    <input type="password" id="ai-api-key" placeholder="Enter API key">
                </div>
                <div class="settings-group">
                    <label for="ai-model-name">Model Name:</label>
                    <input type="text" id="ai-model-name" placeholder="Enter model name">
                </div>
                <div class="settings-buttons">
                    <button id="ai-save-settings">Save</button>
                    <button id="ai-close-settings">Cancel</button>
                </div>
            </div>
        `;

        // 添加样式
        const style = document.createElement('style');
        style.textContent = `
            #ai-chat-container {
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
            }

            #ai-chat-header {
                padding: 15px;
                background: #f8f9fa;
                border-bottom: 1px solid #dee2e6;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            #ai-chat-controls {
                display: flex;
                gap: 10px;
            }

            #ai-chat-controls button {
                background: none;
                border: none;
                cursor: pointer;
                font-size: 16px;
                padding: 5px;
            }

            #ai-chat-messages {
                flex: 1;
                overflow-y: auto;
                padding: 15px;
            }

            #ai-chat-input {
                padding: 15px;
                border-top: 1px solid #dee2e6;
                display: flex;
                gap: 10px;
            }

            #ai-chat-input-text {
                flex: 1;
                padding: 8px;
                border: 1px solid #dee2e6;
                border-radius: 4px;
                resize: none;
                height: 40px;
                font-family: inherit;
            }

            #ai-chat-send-button {
                padding: 8px 16px;
                background: #007bff;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
            }

            #ai-chat-send-button:hover {
                background: #0056b3;
            }

            #ai-chat-send-button:disabled {
                background: #cccccc;
                cursor: not-allowed;
            }

            .ai-chat-message {
                margin-bottom: 15px;
                padding: 8px;
                border-radius: 8px;
                max-width: 85%;
            }

            .user-message {
                margin-left: auto;
                background: #007bff;
                color: white;
            }

            .ai-message {
                margin-right: auto;
                background: #f8f9fa;
                border: 1px solid #dee2e6;
            }

            #ai-chat-settings-panel {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: white;
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                z-index: 1000000;
            }

            .settings-group {
                margin-bottom: 15px;
            }

            .settings-group label {
                display: block;
                margin-bottom: 5px;
            }

            .settings-group input {
                width: 100%;
                padding: 8px;
                border: 1px solid #dee2e6;
                border-radius: 4px;
            }

            .settings-buttons {
                display: flex;
                justify-content: flex-end;
                gap: 10px;
                margin-top: 20px;
            }

            .settings-buttons button {
                padding: 8px 16px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
            }

            #ai-save-settings {
                background: #28a745;
                color: white;
            }

            #ai-close-settings {
                background: #dc3545;
                color: white;
            }
        `;

        // 添加到页面
        document.head.appendChild(style);
        document.body.appendChild(chatContainer);
        console.log('[Content] Chat container and styles added to page');

        // 立即设置事件监听器
        console.log('[Content] Setting up event listeners');
        const input = document.getElementById('ai-chat-input-text');
        const sendButton = document.getElementById('ai-chat-send-button');
        const closeButton = document.getElementById('ai-chat-close');
        const settingsButton = document.getElementById('ai-chat-settings');
        const settingsPanel = document.getElementById('ai-chat-settings-panel');
        const saveSettingsButton = document.getElementById('ai-save-settings');
        const closeSettingsButton = document.getElementById('ai-close-settings');

        // 发送消息处理函数
        function handleSendMessage(event) {
            console.log('[Content] Send button clicked');
            event.preventDefault();
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
                settingsPanel.style.display = settingsPanel.style.display === 'none' ? 'block' : 'none';
            };
        }

        if (saveSettingsButton) {
            saveSettingsButton.onclick = () => {
                console.log('[Content] Save settings button clicked');
                apiSettings = {
                    baseUrl: document.getElementById('ai-base-url').value.trim(),
                    apiKey: document.getElementById('ai-api-key').value.trim(),
                    modelName: document.getElementById('ai-model-name').value.trim()
                };

                chrome.storage.sync.set({ apiSettings }, () => {
                    console.log('[Content] Settings saved');
                    settingsPanel.style.display = 'none';
                });
            };
        }

        if (closeSettingsButton) {
            closeSettingsButton.onclick = () => {
                console.log('[Content] Close settings button clicked');
                settingsPanel.style.display = 'none';
            };
        }

        // 加载外部库
        console.log('[Content] Loading external libraries');
        await loadExternalLibraries();
        console.log('[Content] External libraries loaded');

        // 加载设置
        const baseUrlInput = document.getElementById('ai-base-url');
        const apiKeyInput = document.getElementById('ai-api-key');
        const modelNameInput = document.getElementById('ai-model-name');

        if (baseUrlInput && apiKeyInput && modelNameInput) {
            baseUrlInput.value = apiSettings.baseUrl;
            apiKeyInput.value = apiSettings.apiKey;
            modelNameInput.value = apiSettings.modelName;
            console.log('[Content] Settings loaded into panel');
        } else {
            console.error('[Content] Settings panel elements not found');
        }

        // 添加初始消息
        console.log('[Content] Adding welcome message');
        addMessage('AI', '你好！我是AI助手，有什么可以帮你的吗？');

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
        // 添加样式
        const styleLink = document.createElement('link');
        styleLink.href = chrome.runtime.getURL('lib/github.min.css');
        styleLink.rel = 'stylesheet';
        document.head.appendChild(styleLink);
        console.log('[Content] Added stylesheet:', styleLink.href);

        // 同步加载 marked.js
        console.log('[Content] Loading marked.js');
        const markedScript = document.createElement('script');
        markedScript.src = chrome.runtime.getURL('lib/marked.min.js');
        markedScript.async = false;
        document.head.appendChild(markedScript);
        
        // 同步加载 highlight.js
        console.log('[Content] Loading highlight.js');
        const highlightScript = document.createElement('script');
        highlightScript.src = chrome.runtime.getURL('lib/highlight.min.js');
        highlightScript.async = false;
        document.head.appendChild(highlightScript);

        // 等待库加载完成
        await new Promise((resolve) => {
            highlightScript.onload = () => {
                console.log('[Content] highlight.js loaded');
                if (window.marked && window.hljs) {
                    resolve();
                }
            };
            markedScript.onload = () => {
                console.log('[Content] marked.js loaded');
                if (window.marked && window.hljs) {
                    resolve();
                }
            };
        });

        console.log('[Content] Libraries loaded successfully:', {
            marked: !!window.marked,
            hljs: !!window.hljs
        });

        // 配置marked
        try {
            window.marked.setOptions({
                renderer: new window.marked.Renderer(),
                highlight: function(code, language) {
                    const validLanguage = window.hljs.getLanguage(language) ? language : 'plaintext';
                    return window.hljs.highlight(validLanguage, code).value;
                },
                pedantic: false,
                gfm: true,
                breaks: true,
                sanitize: false,
                smartypants: false,
                xhtml: false
            });
            console.log('[Content] marked.js configured successfully');
        } catch (error) {
            console.error('[Content] Error configuring marked:', error);
            throw error;
        }

        console.log('[Content] External libraries setup completed');
    } catch (error) {
        console.error('[Content] Error loading external libraries:', error);
        throw error;
    }
}

// 注入脚本的辅助函数
async function injectScript(src) {
    console.log('[Content] Injecting script:', src);
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = () => {
            console.log('[Content] Script loaded successfully:', src);
            resolve();
        };
        script.onerror = (error) => {
            console.error('[Content] Error loading script:', src, error);
            reject(new Error(`Failed to load script: ${src}`));
        };
        document.head.appendChild(script);
    });
}

// 加载脚本的辅助函数
function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// 发送消息到AI
async function sendMessage(message) {
    console.log('[Content] Starting sendMessage with:', message);
    
    const input = document.getElementById('ai-chat-input-text');
    const sendButton = document.getElementById('ai-chat-send-button');
    
    // 禁用输入和发送按钮
    input.disabled = true;
    sendButton.disabled = true;

    try {
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
                content: "你是一个helpful的AI助手。以下是当前网页的内容，请基于这些内容回答用户的问题：\n\n" + pageContent
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
                const messagesContainer = document.getElementById('ai-chat-messages');
                const lastMessage = messagesContainer.lastElementChild;
                if (lastMessage && lastMessage.classList.contains('ai-message')) {
                    const contentDiv = lastMessage.querySelector('.message-content');
                    try {
                        console.log('[Content] Parsing markdown');
                        contentDiv.innerHTML = marked.parse(currentContent);
                        // 应用代码高亮
                        contentDiv.querySelectorAll('pre code').forEach((block) => {
                            hljs.highlightBlock(block);
                        });
                    } catch (error) {
                        console.error('Error parsing markdown:', error);
                        contentDiv.textContent = currentContent;
                    }
                    messagesContainer.scrollTop = messagesContainer.scrollHeight;
                }
            } else if (response.type === 'done') {
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
            // 3. 如果都没有，获取body中的所有p标签内容
            const paragraphs = document.querySelectorAll('p');
            content = Array.from(paragraphs)
                .map(p => p.textContent)
                .join('\n\n');
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
    const maxLength = 4000;
    if (fullContent.length > maxLength) {
        return fullContent.substring(0, maxLength) + '...（内容已截断）';
    }

    return fullContent;
}

// 添加消息到界面
function addMessage(sender, text, isStream = false) {
    const messagesContainer = document.getElementById('ai-chat-messages');
    
    // 如果是流式输出且已有AI消息，则追加到最后一条消息
    if (isStream && sender === 'AI') {
        const lastMessage = messagesContainer.lastElementChild;
        if (lastMessage && lastMessage.classList.contains('ai-message')) {
            const contentDiv = lastMessage.querySelector('.message-content');
            try {
                console.log('[Content] Parsing markdown');
                contentDiv.innerHTML = window.marked.parse(text);
                // 应用代码高亮
                contentDiv.querySelectorAll('pre code').forEach((block) => {
                    window.hljs.highlightBlock(block);
                });
            } catch (error) {
                console.error('Error parsing markdown:', error);
                contentDiv.textContent = text;
            }
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
            return;
        }
    }

    // 创建新消息
    const messageDiv = document.createElement('div');
    messageDiv.className = `ai-chat-message ${sender.toLowerCase()}-message`;

    // 创建头像
    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'message-avatar';
    avatarDiv.textContent = sender === 'AI' ? '🤖' : '👤';

    // 创建消息内容
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    // 根据发送者处理消息格式
    if (sender === 'AI') {
        // AI消息使用Markdown格式
        try {
            contentDiv.innerHTML = window.marked.parse(text);
            // 应用代码高亮
            contentDiv.querySelectorAll('pre code').forEach((block) => {
                window.hljs.highlightBlock(block);
            });
        } catch (error) {
            console.error('Error parsing markdown:', error);
            contentDiv.textContent = text;
        }
    } else {
        // 用户消息保持纯文本
        contentDiv.textContent = text;
    }

    // 添加组件到消息div
    if (sender === 'user') {
        messageDiv.appendChild(contentDiv);
        messageDiv.appendChild(avatarDiv);
    } else {
        messageDiv.appendChild(avatarDiv);
        messageDiv.appendChild(contentDiv);
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
