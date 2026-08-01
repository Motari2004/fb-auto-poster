import { dbStateManager } from './db-state-manager.js';

class DataManager {
  constructor() {
    this.useDb = true;
    console.log(`📊 DataManager: ${dbStateManager.getMode()}`);
  }

  async readQueue() {
    try {
      const queue = await dbStateManager.getQueue();
      console.log(`📋 Queue loaded from DB: ${queue.length} posts`);
      return queue;
    } catch (error) {
      console.error('❌ Error reading queue:', error);
      return [];
    }
  }

  async writeQueue(data) {
    try {
      await dbStateManager.setQueue(data);
      console.log(`💾 Queue saved to DB: ${data.length} posts`);
    } catch (error) {
      console.error('❌ Error saving queue:', error);
    }
  }

  async readHistory() {
    try {
      const history = await dbStateManager.getHistory();
      console.log(`📋 History loaded from DB: ${history.length} entries`);
      return history;
    } catch (error) {
      console.error('❌ Error reading history:', error);
      return [];
    }
  }

  async writeHistory(data) {
    try {
      await dbStateManager.setHistory(data);
      console.log(`💾 History saved to DB: ${data.length} entries`);
    } catch (error) {
      console.error('❌ Error saving history:', error);
    }
  }

  async readRunningState() {
    try {
      const running = await dbStateManager.getRunningState();
      console.log(`📋 Running state loaded from DB: ${running ? 'Running' : 'Stopped'}`);
      return { running };
    } catch (error) {
      console.error('❌ Error reading running state:', error);
      return { running: false };
    }
  }

  async writeRunningState(data) {
    try {
      await dbStateManager.setRunningState(data.running);
      console.log(`💾 Running state saved to DB: ${data.running ? 'Running' : 'Stopped'}`);
    } catch (error) {
      console.error('❌ Error saving running state:', error);
    }
  }

  async readSettings() {
    try {
      const settings = await dbStateManager.getSettings();
      console.log(`📋 Settings loaded from DB: ${settings.postIntervalMinutes}m`);
      return settings;
    } catch (error) {
      console.error('❌ Error reading settings:', error);
      return { postIntervalMinutes: 15 };
    }
  }

  async writeSettings(data) {
    try {
      await dbStateManager.setSettings(data);
      console.log(`💾 Settings saved to DB: ${data.postIntervalMinutes}m`);
    } catch (error) {
      console.error('❌ Error saving settings:', error);
    }
  }

  async deleteQueue() {
    try {
      await dbStateManager.setQueue([]);
      console.log('🗑️ Queue deleted from DB');
    } catch (error) {
      console.error('❌ Error deleting queue:', error);
    }
  }

  async clearAll() {
    try {
      await dbStateManager.setQueue([]);
      await dbStateManager.setHistory([]);
      await dbStateManager.setRunningState(false);
      await dbStateManager.setSettings({ postIntervalMinutes: 15 });
      console.log('🗑️ All data cleared from DB');
    } catch (error) {
      console.error('❌ Error clearing data:', error);
    }
  }

  getMode() {
    return dbStateManager.getMode();
  }
}

export const dataManager = new DataManager();