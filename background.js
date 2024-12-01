// 默认设置
const defaultSettings = {
    baseUrl: 'http://openai.sz-hgy.com:9002/v1',
    apiKey: 'sk-0zw5FQaOueD5CEhL54D945C50cB04845A46eB1F5Be9cFd3f',
    modelName: 'glm4'
};

// 监听扩展安装事件
chrome.runtime.onInstalled.addListener(() => {
    console.log('[Background] Extension installed, setting default API settings');
    chrome.storage.sync.set({
        apiSettings: defaultSettings
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
            modelName: settings.modelName || defaultSettings.modelName
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
            apiKey: '******' // 隐藏API密钥
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
