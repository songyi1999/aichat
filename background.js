// 默认设置
const defaultSettings = {
    baseUrl: 'https://openai.sz-hgy.com:9003/v1',
    apiKey: 'sk-0zw5FQaOueD5CEhL54D945C50cB04845A46eB1F5Be9cFd3f',
    modelName: 'glm4',
    systemPrompt: '你是一个helpful的AI助手'
};

// 监听扩展安装事件
chrome.runtime.onInstalled.addListener(() => {
    console.log('[Background] Extension installed');
    chrome.storage.local.set({
        apiSettings: {},  // 首次安装时设置为空对象
        systemPrompt: defaultSettings.systemPrompt  // 系统提示语使用默认值
    });
});

// 监听扩展图标点击事件
chrome.action.onClicked.addListener((tab) => {
    console.log('[Background] Extension icon clicked, sending toggleChat message');
    chrome.tabs.sendMessage(tab.id, { action: 'toggleChat' });
});

// 检查和补充API设置
function validateApiSettings(settings) {
    console.log('[Background] Validating API settings:', { ...settings, apiKey: '******' });
    if (!settings.baseUrl || !settings.apiKey || !settings.modelName) {
        console.log('[Background] Using default settings for missing values');
        return {
            baseUrl: settings.baseUrl || defaultSettings.baseUrl,
            apiKey: settings.apiKey || defaultSettings.apiKey,
            modelName: settings.modelName || defaultSettings.modelName,
            systemPrompt: settings.systemPrompt || defaultSettings.systemPrompt
        };
    }
    return settings;
}

// 处理API请求
async function handleApiRequest(data, port) {
    console.log('[Background] Handling API request');
    try {
        // 验证并补充API设置
        const validatedSettings = validateApiSettings(data);
        console.log('[Background] Making API request with settings:', {
            baseUrl: validatedSettings.baseUrl,
            modelName: validatedSettings.modelName,
            apiKey: '******', 
            systemPrompt: validatedSettings.systemPrompt
        });

        console.log('[Background] Sending fetch request to:', `${validatedSettings.baseUrl}/chat/completions`);
        const response = await fetch(`${validatedSettings.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${validatedSettings.apiKey}`
            },
            body: JSON.stringify({
                model: validatedSettings.modelName,
                messages: data.messages,
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
        chrome.storage.local.get(['apiSettings', 'systemPrompt'], function(result) {
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
        chrome.storage.local.get(['apiSettings', 'systemPrompt'], function(result) {
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
});

// 监听长连接
chrome.runtime.onConnect.addListener(function(port) {
    console.log('[Background] New port connection:', port.name);
    if (port.name === "ai-chat") {
        port.onMessage.addListener(function(request) {
            console.log('[Background] Received message:', request);
            if (request.action === 'makeApiRequest') {
                handleApiRequest(request.data, port);
            }
        });
    }
});
