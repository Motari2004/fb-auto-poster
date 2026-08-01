import fs from 'fs-extra';
import { readData, writeData, deleteData, dataExists } from './storage.js';
import {
  USE_BLOB_STORAGE,
  POST_QUEUE_FILE,
  POSTED_HISTORY_FILE,
  RUNNING_STATE_FILE,
  SETTINGS_FILE,
  BLOB_KEYS,
} from './config.js';

class DataManager {
  constructor() {
    this.useBlob = USE_BLOB_STORAGE;
  }

  async readQueue() {
    if (this.useBlob) {
      const data = await readData(BLOB_KEYS.QUEUE);
      return data || [];
    }
    // Local file
    if (await fs.pathExists(POST_QUEUE_FILE)) {
      return await fs.readJson(POST_QUEUE_FILE);
    }
    return [];
  }

  async writeQueue(data) {
    if (this.useBlob) {
      await writeData(BLOB_KEYS.QUEUE, data);
    } else {
      await fs.ensureDir(DATA_DIR);
      await fs.writeJson(POST_QUEUE_FILE, data, { spaces: 2 });
    }
  }

  async readHistory() {
    if (this.useBlob) {
      const data = await readData(BLOB_KEYS.HISTORY);
      return data || [];
    }
    if (await fs.pathExists(POSTED_HISTORY_FILE)) {
      return await fs.readJson(POSTED_HISTORY_FILE);
    }
    return [];
  }

  async writeHistory(data) {
    if (this.useBlob) {
      await writeData(BLOB_KEYS.HISTORY, data);
    } else {
      await fs.ensureDir(DATA_DIR);
      await fs.writeJson(POSTED_HISTORY_FILE, data, { spaces: 2 });
    }
  }

  async readRunningState() {
    if (this.useBlob) {
      const data = await readData(BLOB_KEYS.RUNNING_STATE);
      return data || { running: false };
    }
    if (await fs.pathExists(RUNNING_STATE_FILE)) {
      return await fs.readJson(RUNNING_STATE_FILE);
    }
    return { running: false };
  }

  async writeRunningState(data) {
    if (this.useBlob) {
      await writeData(BLOB_KEYS.RUNNING_STATE, data);
    } else {
      await fs.ensureDir(DATA_DIR);
      await fs.writeJson(RUNNING_STATE_FILE, data, { spaces: 2 });
    }
  }

  async readSettings() {
    if (this.useBlob) {
      const data = await readData(BLOB_KEYS.SETTINGS);
      return data || { postIntervalMinutes: 15 };
    }
    if (await fs.pathExists(SETTINGS_FILE)) {
      return await fs.readJson(SETTINGS_FILE);
    }
    return { postIntervalMinutes: 15 };
  }

  async writeSettings(data) {
    if (this.useBlob) {
      await writeData(BLOB_KEYS.SETTINGS, data);
    } else {
      await fs.ensureDir(DATA_DIR);
      await fs.writeJson(SETTINGS_FILE, data, { spaces: 2 });
    }
  }

  async deleteQueue() {
    if (this.useBlob) {
      await deleteData(BLOB_KEYS.QUEUE);
    } else {
      await fs.writeJson(POST_QUEUE_FILE, [], { spaces: 2 });
    }
  }

  async clearAll() {
    if (this.useBlob) {
      await deleteData(BLOB_KEYS.QUEUE);
      await deleteData(BLOB_KEYS.HISTORY);
      await deleteData(BLOB_KEYS.RUNNING_STATE);
      await deleteData(BLOB_KEYS.SETTINGS);
    } else {
      await fs.writeJson(POST_QUEUE_FILE, [], { spaces: 2 });
      await fs.writeJson(POSTED_HISTORY_FILE, [], { spaces: 2 });
      await fs.writeJson(RUNNING_STATE_FILE, { running: false }, { spaces: 2 });
      await fs.writeJson(SETTINGS_FILE, { postIntervalMinutes: 15 }, { spaces: 2 });
    }
  }
}

export const dataManager = new DataManager();