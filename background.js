// 默认设置
const defaultSettings = {
    baseUrl: 'https://openai.sz-hgy.com:9003/v1',
    apiKey: 'sk-0zw5FQaOueD5CEhL54D945C50cB04845A46eB1F5Be9cFd3f',
    modelName: 'glm4',
    systemPrompt: '你是一个helpful的AI助手'
};

// Chat history management
const DB_NAME = 'chatHistoryDB';
const DB_VERSION = 1;
const STORE_NAME = 'chatHistory';
const MAX_HISTORY_DAYS = 30;

let db = null;

// 初始化 IndexedDB
async function initDB() {
    if (db) return db;

    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, { keyPath: 'timestamp' });
                store.createIndex('role', 'role');
                store.createIndex('timestamp', 'timestamp');
            }
        };

        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };
    });
}

// 添加聊天记录
async function addChatHistory(content, role, url) {
    const db = await initDB();
    const timestamp = new Date().toISOString();
    const newChat = { timestamp, content, role, url };

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);

        const request = store.add(newChat);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);

        transaction.oncomplete = () => {
            // 清理过期记录
            cleanupOldChats();
        };
    });
}

// 清理过期记录
async function cleanupOldChats() {
    const db = await initDB();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - MAX_HISTORY_DAYS);

    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('timestamp');

    const range = IDBKeyRange.upperBound(thirtyDaysAgo.toISOString());
    index.openCursor(range).onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
            store.delete(cursor.primaryKey);
            cursor.continue();
        }
    };
}

// 获取所有聊天记录
async function getAllChatHistory() {
    const db = await initDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);

        const request = store.getAll();
        request.onsuccess = () => {
            const history = request.result.sort((a, b) =>
                new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
            );
            resolve(history);
        };
        request.onerror = () => reject(request.error);
    });
}

// 删除指定的聊天记录
async function deleteChatHistory(timestamps) {
    const db = await initDB();

    // 如果是删除全部
    if (timestamps === 'all') {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);

            const request = store.clear(); // 使用 clear() 清空所有记录
            request.onsuccess = () => {
                console.log('[Background] All chat history deleted');
                resolve();
            };
            request.onerror = () => reject(request.error);
        });
    }

    // 删除指定记录的逻辑保持不变
    return Promise.all(timestamps.map(timestamp =>
        new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);

            const request = store.delete(timestamp);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        })
    ));
}

// 导出聊天记录
async function exportChatHistory(format = 'json') {
    const history = await getAllChatHistory();

    if (format === 'json') {
        return JSON.stringify(history, null, 2);
    } else if (format === 'csv') {
        const headers = ['Timestamp', 'Role', 'Content', 'URL'];
        const rows = history.map(chat => [
            chat.timestamp,
            chat.role,
            chat.content.replace(/"/g, '""'),
            chat.url
        ]);

        return [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');
    }
}

// 监听扩展安装事件
chrome.runtime.onInstalled.addListener(() => {
    console.log('[Background] Extension installed');
    chrome.storage.local.set({
        apiSettings: {},  // 首次安装时设置为空对象
        systemPrompt: defaultSettings.systemPrompt  // 系统提示语使用默认值
    });
});

// 使用统一的处理方式
function toggleChat(tab) {
    console.log('[Background] Toggle chat requested');
    chrome.tabs.sendMessage(tab.id, { action: 'toggleChat' });
}

// 监听图标点击
chrome.action.onClicked.addListener(toggleChat);

// 监听快捷键
chrome.commands.onCommand.addListener((command) => {
    if (command === "_execute_action") {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            if (tabs[0]) {
                toggleChat(tabs[0]);
            }
        });
    }
});

// 检查和补充API设置
function validateApiSettings(settings) {
    console.log('[Background] Validating API settings:', { ...settings, apiKey: '******' });

    // 获取已保存的设置
    return new Promise((resolve) => {
        chrome.storage.local.get(['apiSettings', 'systemPrompt'], function (result) {
            const savedSettings = {
                ...result.apiSettings,
                systemPrompt: result.systemPrompt
            };

            // 优先使用保存的设置，其次是传入的设置，最后是默认设置
            const finalSettings = {
                baseUrl: savedSettings.baseUrl || settings.baseUrl || defaultSettings.baseUrl,
                apiKey: savedSettings.apiKey || settings.apiKey || defaultSettings.apiKey,
                modelName: savedSettings.modelName || settings.modelName || defaultSettings.modelName,
                systemPrompt: savedSettings.systemPrompt || settings.systemPrompt || defaultSettings.systemPrompt
            };

            resolve(finalSettings);
        });
    });
}

// 处理API请求
async function handleApiRequest(data, port) {
    console.log('[Background] Handling API request');
    try {
        // 验证并补充API设置
        const validatedSettings = await validateApiSettings(data);
        console.log('[Background] Making API request with settings:', {
            baseUrl: validatedSettings.baseUrl,
            modelName: validatedSettings.modelName,
            apiKey: '******',
            systemPrompt: validatedSettings.systemPrompt
        });

        // 确保消息中包含系统提示词
        const messages = [...data.messages];
        if (!messages.find(msg => msg.role === 'system')) {
            messages.unshift({
                role: 'system',
                content: validatedSettings.systemPrompt
            });
        }

        console.log('[Background] Sending fetch request to:', `${validatedSettings.baseUrl}/chat/completions`);
        const response = await fetch(`${validatedSettings.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${validatedSettings.apiKey}`
            },
            body: JSON.stringify({
                model: validatedSettings.modelName,
                messages: messages,
                stream: true
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[Background] API Error:', errorText);
            port.postMessage({ error: `HTTP error! status: ${response.status}, details: ${errorText}` });
            return;
        }

        console.log('[Background] Starting stream reading');
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    console.log('[Background] Stream reading completed');
                    port.postMessage({ type: 'done' });
                    break;
                }

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.trim() === '') continue;
                    if (line.trim() === 'data: [DONE]') {
                        console.log('[Background] Received [DONE] signal');
                        port.postMessage({ type: 'done' });
                        continue;
                    }

                    try {
                        const cleanedLine = line.replace(/^data: /, '');
                        const data = JSON.parse(cleanedLine);

                        if (data.choices && data.choices[0].delta && data.choices[0].delta.content) {
                            console.log('[Background] Sending stream chunk:', data.choices[0].delta.content);
                            port.postMessage({
                                type: 'stream',
                                content: data.choices[0].delta.content
                            });
                        }
                    } catch (e) {
                        console.warn('[Background] Error parsing line:', line, e);
                    }
                }
            }
        } catch (error) {
            console.error('[Background] Stream reading error:', error);
            port.postMessage({ error: error.message });
        }

    } catch (error) {
        console.error('[Background] Error in handleApiRequest:', error);
        port.postMessage({ error: error.message });
    }
}

// 监听来自content script的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('[Background] Received message:', request.action);

    if (request.action === 'getSettings') {
        // 获取已保存的设置，不返回默认值
        chrome.storage.local.get(['apiSettings', 'systemPrompt'], function (result) {
            const settings = {
                ...result.apiSettings,
                systemPrompt: result.systemPrompt
            };
            console.log('[Background] Retrieved saved settings:', {
                ...settings,
                apiKey: settings.apiKey ? '******' : undefined
            });
            sendResponse(settings);
        });
        return true;
    }

    if (request.action === 'saveSettings') {
        // 分别处理API设置和系统提示语
        if (request.settings.systemPrompt !== undefined) {
            // 保存系统提示语
            chrome.storage.local.set({
                systemPrompt: request.settings.systemPrompt
            }, () => {
                console.log('[Background] System prompt saved');
            });
        }

        // 如果有API相关设置，只在所有必填字段都存在时才保存
        if (request.settings.baseUrl || request.settings.apiKey || request.settings.modelName) {
            if (request.settings.baseUrl && request.settings.apiKey && request.settings.modelName) {
                chrome.storage.local.set({
                    apiSettings: {
                        baseUrl: request.settings.baseUrl,
                        apiKey: request.settings.apiKey,
                        modelName: request.settings.modelName
                    }
                }, () => {
                    console.log('[Background] API settings saved');
                });
            }
        }

        sendResponse({ success: true });
        return true;
    }

    if (request.action === 'getDefaultSettings') {
        // 获取已保存的设置和默认设置
        chrome.storage.local.get(['apiSettings', 'systemPrompt'], function (result) {
            const settings = {
                // API设置：如果没有保存则使用默认值
                baseUrl: (result.apiSettings && result.apiSettings.baseUrl) || defaultSettings.baseUrl,
                apiKey: (result.apiSettings && result.apiSettings.apiKey) || defaultSettings.apiKey,
                modelName: (result.apiSettings && result.apiSettings.modelName) || defaultSettings.modelName,
                // 系统提示语：如果没有保存则使用默认值
                systemPrompt: result.systemPrompt || defaultSettings.systemPrompt
            };
            console.log('[Background] Retrieved settings with defaults:', {
                ...settings,
                apiKey: settings.apiKey ? '******' : undefined
            });
            sendResponse(settings);
        });
        return true;
    }

    if (request.action === 'downloadFile') {
        chrome.downloads.download({
            url: request.data.url,
            filename: request.data.filename,
            saveAs: true
        });
    }

    if (request.action === 'addChatHistory') {
        addChatHistory(request.data.content, request.data.role, request.data.url)
            .then(() => sendResponse({ success: true }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true;
    }

    if (request.action === 'getChatHistory') {
        getAllChatHistory()
            .then(history => sendResponse({ success: true, history }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true;
    }

    if (request.action === 'deleteChatHistory') {
        deleteChatHistory(request.data.timestamps)
            .then(() => sendResponse({ success: true }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true;
    }

    if (request.action === 'exportChatHistory') {
        exportChatHistory(request.data.format)
            .then(content => sendResponse({ success: true, content }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true;
    }
});

// 监听长连接
chrome.runtime.onConnect.addListener(function (port) {
    console.log('[Background] New port connection:', port.name);
    if (port.name === "ai-chat") {
        port.onMessage.addListener(function (request) {
            console.log('[Background] Received message:', request);
            if (request.action === 'makeApiRequest') {
                handleApiRequest(request.data, port);
            }
        });
    }
});
