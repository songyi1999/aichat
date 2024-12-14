// Chat history management module

// Constants
const DB_NAME = 'chatHistoryDB';
const DB_VERSION = 1;
const STORE_NAME = 'chatHistory';
const MAX_HISTORY_DAYS = 30;

// Chat history data structure
class ChatHistoryManager {
    constructor() {
        this.initialized = false;
        this.db = null;
    }

    // 初始化 IndexedDB
    async init() {
        if (this.initialized) return;

        try {
            // 打开数据库连接
            const openRequest = indexedDB.open(DB_NAME, DB_VERSION);

            // 处理数据库升级/创建
            openRequest.onupgradeneeded = (event) => {
                const db = event.target.result;
                // 如果存储对象不存在则创建
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    // 创建存储对象并设置索引
                    const store = db.createObjectStore(STORE_NAME, { keyPath: 'timestamp' });
                    store.createIndex('role', 'role');
                    store.createIndex('timestamp', 'timestamp');
                }
            };

            // 等待数据库打开
            this.db = await new Promise((resolve, reject) => {
                openRequest.onsuccess = () => resolve(openRequest.result);
                openRequest.onerror = () => reject(openRequest.error);
            });

            console.log('[ChatHistory] IndexedDB initialized successfully');
            this.initialized = true;
        } catch (error) {
            console.error('[ChatHistory] Failed to initialize IndexedDB:', error);
            throw error;
        }
    }

    // 添加新的聊天记录
    async addChat(content, role, url) {
        await this.init();
        const timestamp = new Date().toISOString();
        const newChat = { timestamp, content, role, url };

        // 开启事务并添加记录
        const transaction = this.db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);

        await new Promise((resolve, reject) => {
            const request = store.add(newChat);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });

        // 清理过期的聊天记录
        await this.cleanupOldChats();
    }

    // 清理过期的聊天记录
    async cleanupOldChats() {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - MAX_HISTORY_DAYS);

        const transaction = this.db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const index = store.index('timestamp');

        // 获取过期的记录并删除
        const range = IDBKeyRange.upperBound(thirtyDaysAgo.toISOString());
        const request = index.openCursor(range);

        await new Promise((resolve) => {
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    store.delete(cursor.primaryKey);
                    cursor.continue();
                } else {
                    resolve();
                }
            };
        });
    }

    // 获取所有聊天记录
    async getHistory() {
        await this.init();
        const transaction = this.db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);

        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => {
                // 按时间排序
                const history = request.result.sort((a, b) =>
                    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
                );
                resolve(history);
            };
            request.onerror = () => reject(request.error);
        });
    }

    // 删除指定时间戳的聊天记录
    async deleteChats(timestamps) {
        await this.init();
        const transaction = this.db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);

        await Promise.all(timestamps.map(timestamp =>
            new Promise((resolve, reject) => {
                const request = store.delete(timestamp);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            })
        ));
    }

    // 清空所有聊天记录
    async clearHistory() {
        await this.init();
        const transaction = this.db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);

        await new Promise((resolve, reject) => {
            const request = store.clear();
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // 导出聊天记录
    async exportHistory(format = 'json') {
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
