import { initDb, getState, setState, getAllStates, testConnection } from './db.js';

class DBStateManager {
  constructor() {
    this.initialized = false;
    this.cache = {};
    this.cacheExpiry = 2000; // 2 seconds cache
    this.lastCacheUpdate = {};
  }

  async initialize() {
    if (this.initialized) return;
    
    try {
      // Test connection first
      const connected = await testConnection();
      if (!connected) {
        console.warn('⚠️ Database connection failed, using fallback mode');
        this.initialized = true;
        return;
      }
      
      await initDb();
      this.initialized = true;
      console.log('✅ DB State Manager initialized with Neon');
    } catch (error) {
      console.error('❌ Error initializing DB State Manager:', error);
      this.initialized = true; // Still mark as initialized to avoid repeated attempts
    }
  }

  async get(key, defaultValue = null) {
    await this.initialize();
    
    // Check cache first
    if (this.cache[key] && this.lastCacheUpdate[key]) {
      const age = Date.now() - this.lastCacheUpdate[key];
      if (age < this.cacheExpiry) {
        return this.cache[key];
      }
    }
    
    try {
      const value = await getState(key);
      if (value === null) {
        return defaultValue;
      }
      
      // Update cache
      this.cache[key] = value;
      this.lastCacheUpdate[key] = Date.now();
      
      return value;
    } catch (error) {
      console.error(`❌ Error getting ${key}:`, error);
      return defaultValue;
    }
  }

  async set(key, value) {
    await this.initialize();
    
    try {
      const result = await setState(key, value);
      
      // Update cache
      this.cache[key] = value;
      this.lastCacheUpdate[key] = Date.now();
      
      return result;
    } catch (error) {
      console.error(`❌ Error setting ${key}:`, error);
      return false;
    }
  }

  async getRunningState() {
    const state = await this.get('running_state', { running: false });
    return state.running || false;
  }

  async setRunningState(running) {
    return await this.set('running_state', { running, updated_at: new Date().toISOString() });
  }

  async getSettings() {
    return await this.get('settings', { postIntervalMinutes: 15 });
  }

  async setSettings(settings) {
    return await this.set('settings', settings);
  }

  async getQueue() {
    return await this.get('queue', []);
  }

  async setQueue(queue) {
    return await this.set('queue', queue);
  }

  async getHistory() {
    return await this.get('history', []);
  }

  async setHistory(history) {
    return await this.set('history', history);
  }

  async getAll() {
    await this.initialize();
    return await getAllStates();
  }

  // Force refresh cache
  async refreshCache(key) {
    if (key) {
      const value = await getState(key);
      this.cache[key] = value;
      this.lastCacheUpdate[key] = Date.now();
      return value;
    } else {
      const all = await getAllStates();
      for (const row of all) {
        this.cache[row.key] = row.value;
        this.lastCacheUpdate[row.key] = Date.now();
      }
      return all;
    }
  }

  // Clear cache
  clearCache() {
    this.cache = {};
    this.lastCacheUpdate = {};
  }

  getMode() {
    return 'Neon Database';
  }
}

// Singleton instance
const dbStateManager = new DBStateManager();

// Initialize on import
dbStateManager.initialize().catch(console.error);

export { dbStateManager };