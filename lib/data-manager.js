import fs from 'fs-extra';
import { readBlob, writeBlob, deleteBlob } from './blob-storage.js';
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
    this.useBlob = USE_BLOB_STORAGE;
    console.log(`📊 DataManager: ${this.useBlob ? 'Blob Storage' : 'Local Files'}`);
  }

  async readQueue() {
    if (this.useBlob) {
      const data = await readBlob('post_queue.json');
      return data || [];
    }
    if (await fs.pathExists(POST_QUEUE_FILE)) {
      return await fs.readJson(POST_QUEUE_FILE);
    }
    return [];
  }

  async writeQueue(data) {
    if (this.useBlob) {
      await writeBlob('post_queue.json', data);
    } else {
      await fs.ensureDir(DATA_DIR);
      await fs.writeJson(POST_QUEUE_FILE, data, { spaces: 2 });
    }
  }

  async readHistory() {
    if (this.useBlob) {
      const data = await readBlob('posted_history.json');
      return data || [];
    }
    if (await fs.pathExists(POSTED_HISTORY_FILE)) {
      return await fs.readJson(POSTED_HISTORY_FILE);
    }
    return [];
  }

  async writeHistory(data) {
    if (this.useBlob) {
      await writeBlob('posted_history.json', data);
    } else {
      await fs.ensureDir(DATA_DIR);
      await fs.writeJson(POSTED_HISTORY_FILE, data, { spaces: 2 });
    }
  }

  async readRunningState() {
    if (this.useBlob) {
      const data = await readBlob('running_state.json');
      return data || { running: false };
    }
    if (await fs.pathExists(RUNNING_STATE_FILE)) {
      return await fs.readJson(RUNNING_STATE_FILE);
    }
    return { running: false };
  }

  async writeRunningState(data) {
    if (this.useBlob) {
      await writeBlob('running_state.json', data);
    } else {
      await fs.ensureDir(DATA_DIR);
      await fs.writeJson(RUNNING_STATE_FILE, data, { spaces: 2 });
    }
  }

  async readSettings() {
    if (this.useBlob) {
      const data = await readBlob('settings.json');
      return data || { postIntervalMinutes: 15 };
    }
    if (await fs.pathExists(SETTINGS_FILE)) {
      return await fs.readJson(SETTINGS_FILE);
    }
    return { postIntervalMinutes: 15 };
  }

  async writeSettings(data) {
    if (this.useBlob) {
      await writeBlob('settings.json', data);
    } else {
      await fs.ensureDir(DATA_DIR);
      await fs.writeJson(SETTINGS_FILE, data, { spaces: 2 });
    }
  }

  async deleteQueue() {
    if (this.useBlob) {
      await deleteBlob('post_queue.json');
    } else {
      await fs.writeJson(POST_QUEUE_FILE, [], { spaces: 2 });
    }
  }

  async clearAll() {
    if (this.useBlob) {
      await deleteBlob('post_queue.json');
      await deleteBlob('posted_history.json');
      await deleteBlob('running_state.json');
      await deleteBlob('settings.json');
    } else {
      await fs.ensureDir(DATA_DIR);
      await fs.writeJson(POST_QUEUE_FILE, [], { spaces: 2 });
      await fs.writeJson(POSTED_HISTORY_FILE, [], { spaces: 2 });
      await fs.writeJson(RUNNING_STATE_FILE, { running: false }, { spaces: 2 });
      await fs.writeJson(SETTINGS_FILE, { postIntervalMinutes: 15 }, { spaces: 2 });
    }
  }

  getMode() {
    return this.useBlob ? 'Blob Storage' : 'Local Files';
  }
}

export const dataManager = new DataManager();