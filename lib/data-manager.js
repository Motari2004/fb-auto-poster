import fs from 'fs-extra';
import { 
  readBlob, 
  writeBlob, 
  deleteBlob, 
  isBlobConfigured,
  getPublicBlobUrl 
} from './blob-storage.js';
import {
  USE_BLOB_STORAGE,
  DATA_DIR,
  POST_QUEUE_FILE,
  POSTED_HISTORY_FILE,
  RUNNING_STATE_FILE,
  SETTINGS_FILE,
} from './config.js';

class DataManager {
  constructor() {
    const isVercel = process.env.VERCEL === '1';
    // Force blob storage on Vercel
    this.useBlob = isVercel ? true : USE_BLOB_STORAGE;
    
    console.log(`📊 DataManager: ${this.useBlob ? 'Blob Storage' : 'Local Files'}`);
    if (this.useBlob) {
      console.log('🔗 Using Vercel Blob Storage for persistence');
    } else {
      console.log('⚠️ Using local files (may not persist on Vercel)');
    }
  }

  async readQueue() {
    try {
      if (this.useBlob) {
        const data = await readBlob('post_queue.json');
        if (data !== null) {
          console.log(`📋 Queue loaded from blob: ${data.length} posts`);
          return data;
        }
      }
      // Fallback to local file
      if (await fs.pathExists(POST_QUEUE_FILE)) {
        const data = await fs.readJson(POST_QUEUE_FILE);
        console.log(`📋 Queue loaded from local: ${data.length} posts`);
        return data;
      }
    } catch (error) {
      console.error('Error reading queue:', error);
    }
    return [];
  }

  async writeQueue(data) {
    try {
      if (this.useBlob) {
        await writeBlob('post_queue.json', data);
        console.log(`💾 Queue saved to blob: ${data.length} posts`);
        return;
      }
      // Fallback to local file
      await fs.ensureDir(DATA_DIR);
      await fs.writeJson(POST_QUEUE_FILE, data, { spaces: 2 });
      console.log(`💾 Queue saved to local: ${data.length} posts`);
    } catch (error) {
      console.error('Error saving queue:', error);
    }
  }

  async readHistory() {
    try {
      if (this.useBlob) {
        const data = await readBlob('posted_history.json');
        if (data !== null) {
          console.log(`📋 History loaded from blob: ${data.length} entries`);
          return data;
        }
      }
      if (await fs.pathExists(POSTED_HISTORY_FILE)) {
        const data = await fs.readJson(POSTED_HISTORY_FILE);
        console.log(`📋 History loaded from local: ${data.length} entries`);
        return data;
      }
    } catch (error) {
      console.error('Error reading history:', error);
    }
    return [];
  }

  async writeHistory(data) {
    try {
      if (this.useBlob) {
        await writeBlob('posted_history.json', data);
        console.log(`💾 History saved to blob: ${data.length} entries`);
        return;
      }
      await fs.ensureDir(DATA_DIR);
      await fs.writeJson(POSTED_HISTORY_FILE, data, { spaces: 2 });
      console.log(`💾 History saved to local: ${data.length} entries`);
    } catch (error) {
      console.error('Error saving history:', error);
    }
  }

  async readRunningState() {
    try {
      if (this.useBlob) {
        const data = await readBlob('running_state.json');
        if (data !== null) {
          console.log(`📋 Running state loaded from blob: ${data.running ? 'Running' : 'Stopped'}`);
          return data;
        }
      }
      if (await fs.pathExists(RUNNING_STATE_FILE)) {
        const data = await fs.readJson(RUNNING_STATE_FILE);
        console.log(`📋 Running state loaded from local: ${data.running ? 'Running' : 'Stopped'}`);
        return data;
      }
    } catch (error) {
      console.error('Error reading running state:', error);
    }
    return { running: false };
  }

  async writeRunningState(data) {
    try {
      if (this.useBlob) {
        await writeBlob('running_state.json', data);
        console.log(`💾 Running state saved to blob: ${data.running ? 'Running' : 'Stopped'}`);
        return;
      }
      await fs.ensureDir(DATA_DIR);
      await fs.writeJson(RUNNING_STATE_FILE, data, { spaces: 2 });
      console.log(`💾 Running state saved to local: ${data.running ? 'Running' : 'Stopped'}`);
    } catch (error) {
      console.error('Error saving running state:', error);
    }
  }

  async readSettings() {
    try {
      if (this.useBlob) {
        const data = await readBlob('settings.json');
        if (data !== null) {
          console.log(`📋 Settings loaded from blob: ${data.postIntervalMinutes}m`);
          return data;
        }
      }
      if (await fs.pathExists(SETTINGS_FILE)) {
        const data = await fs.readJson(SETTINGS_FILE);
        console.log(`📋 Settings loaded from local: ${data.postIntervalMinutes}m`);
        return data;
      }
    } catch (error) {
      console.error('Error reading settings:', error);
    }
    return { postIntervalMinutes: 15 };
  }

  async writeSettings(data) {
    try {
      if (this.useBlob) {
        await writeBlob('settings.json', data);
        console.log(`💾 Settings saved to blob: ${data.postIntervalMinutes}m`);
        return;
      }
      await fs.ensureDir(DATA_DIR);
      await fs.writeJson(SETTINGS_FILE, data, { spaces: 2 });
      console.log(`💾 Settings saved to local: ${data.postIntervalMinutes}m`);
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  }

  async deleteQueue() {
    try {
      if (this.useBlob) {
        await deleteBlob('post_queue.json');
        console.log('🗑️ Queue deleted from blob');
        return;
      }
      await fs.writeJson(POST_QUEUE_FILE, [], { spaces: 2 });
      console.log('🗑️ Queue deleted from local');
    } catch (error) {
      console.error('Error deleting queue:', error);
    }
  }

  async clearAll() {
    try {
      if (this.useBlob) {
        await deleteBlob('post_queue.json');
        await deleteBlob('posted_history.json');
        await deleteBlob('running_state.json');
        await deleteBlob('settings.json');
        console.log('🗑️ All data cleared from blob');
        return;
      }
      await fs.ensureDir(DATA_DIR);
      await fs.writeJson(POST_QUEUE_FILE, [], { spaces: 2 });
      await fs.writeJson(POSTED_HISTORY_FILE, [], { spaces: 2 });
      await fs.writeJson(RUNNING_STATE_FILE, { running: false }, { spaces: 2 });
      await fs.writeJson(SETTINGS_FILE, { postIntervalMinutes: 15 }, { spaces: 2 });
      console.log('🗑️ All data cleared from local');
    } catch (error) {
      console.error('Error clearing data:', error);
    }
  }

  getPublicUrl(key) {
    if (this.useBlob) {
      return getPublicBlobUrl(key);
    }
    return null;
  }

  getMode() {
    return this.useBlob ? 'Blob Storage' : 'Local Files';
  }
}

export const dataManager = new DataManager();