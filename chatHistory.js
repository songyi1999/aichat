// Chat history management module

// Constants
const MAX_STORAGE_SIZE = 5 * 1024 * 1024; // 5MB in bytes
const MAX_HISTORY_DAYS = 30;
const STORAGE_KEY_PREFIX = 'chatHistory_';
const CHUNK_SIZE = 5; // 每个块存储的聊天记录数量

// Chat history data structure
class ChatHistoryManager {
    constructor() {
        this.initialized = false;
    }

    async init() {
        if (this.initialized) return;
        
        // Check if user is signed in to Chrome
        try {
            await chrome.storage.sync.get(null);
            this.storage = chrome.storage.sync;
        } catch (error) {
            console.log('[ChatHistory] Sync storage not available, falling back to local storage');
            this.storage = chrome.storage.local;
        }
        
        this.initialized = true;
    }

    // 获取所有聊天记录的键
    async getAllHistoryKeys() {
        const result = await this.storage.get(null);
        return Object.keys(result).filter(key => key.startsWith(STORAGE_KEY_PREFIX));
    }

    // 获取下一个可用的块索引
    async getNextChunkIndex() {
        const keys = await this.getAllHistoryKeys();
        if (keys.length === 0) return 0;
        const indices = keys.map(key => parseInt(key.replace(STORAGE_KEY_PREFIX, '')));
        return Math.max(...indices) + 1;
    }

    async addChat(content, role, url) {
        await this.init();
        const timestamp = new Date().toISOString();
        const newChat = { timestamp, content, role, url };
        
        // 获取最后一个块
        const keys = await this.getAllHistoryKeys();
        let lastChunkKey = keys.length > 0 ? keys[keys.length - 1] : null;
        let lastChunk = lastChunkKey ? (await this.storage.get(lastChunkKey))[lastChunkKey] : [];

        // 如果最后一个块已满或不存在，创建新块
        if (!lastChunkKey || lastChunk.length >= CHUNK_SIZE) {
            const nextIndex = await this.getNextChunkIndex();
            lastChunkKey = `${STORAGE_KEY_PREFIX}${nextIndex}`;
            lastChunk = [];
        }

        // 添加新聊天记录
        lastChunk.push(newChat);

        // 保存更新后的块
        await this.storage.set({ [lastChunkKey]: lastChunk });

        // 清理过期的聊天记录
        await this.cleanupOldChats();
    }

    async cleanupOldChats() {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - MAX_HISTORY_DAYS);

        const keys = await this.getAllHistoryKeys();
        for (const key of keys) {
            const chunk = (await this.storage.get(key))[key];
            const filteredChunk = chunk.filter(chat => new Date(chat.timestamp) > thirtyDaysAgo);
            
            if (filteredChunk.length === 0) {
                // 如果块为空，删除它
                await this.storage.remove(key);
            } else if (filteredChunk.length !== chunk.length) {
                // 如果有记录被过滤掉，更新块
                await this.storage.set({ [key]: filteredChunk });
            }
        }
    }

    async getHistory() {
        await this.init();
        const keys = await this.getAllHistoryKeys();
        const chunks = await Promise.all(
            keys.map(async key => (await this.storage.get(key))[key])
        );
        return chunks.flat().sort((a, b) => 
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
    }

    async deleteChats(timestamps) {
        await this.init();
        const keys = await this.getAllHistoryKeys();
        
        for (const key of keys) {
            const chunk = (await this.storage.get(key))[key];
            const filteredChunk = chunk.filter(chat => !timestamps.includes(chat.timestamp));
            
            if (filteredChunk.length === 0) {
                // 如果块为空，删除它
                await this.storage.remove(key);
            } else if (filteredChunk.length !== chunk.length) {
                // 如果有记录被删除，更新块
                await this.storage.set({ [key]: filteredChunk });
            }
        }
    }

    async clearHistory() {
        await this.init();
        const keys = await this.getAllHistoryKeys();
        for (const key of keys) {
            await this.storage.remove(key);
        }
    }

    async exportHistory(format = 'json') {
        await this.init();
        const history = await this.getHistory();
        
        if (format === 'json') {
            return JSON.stringify(history, null, 2);
        } else if (format === 'csv') {
            const headers = ['Timestamp', 'Role', 'Content', 'URL'];
            const rows = history.map(chat => [
                chat.timestamp,
                chat.role,
                chat.content.replace(/"/g, '""'), // Escape quotes for CSV
                chat.url
            ]);
            
            const csvContent = [
                headers.join(','),
                ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
            ].join('\n');
            
            return csvContent;
        }
    }
}

// Create global instance
window.chatHistoryManager = new ChatHistoryManager();
