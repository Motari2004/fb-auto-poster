import path from 'path';

// Check if running on Vercel
const isVercel = process.env.VERCEL === '1';

// Use blob storage for Vercel, else use local files
export const USE_BLOB_STORAGE = isVercel;

// Local file paths (for development)
export const DATA_DIR = path.join(process.cwd(), 'data');
export const POST_QUEUE_FILE = path.join(DATA_DIR, 'post_queue.json');
export const POSTED_HISTORY_FILE = path.join(DATA_DIR, 'posted_history.json');
export const RUNNING_STATE_FILE = path.join(DATA_DIR, 'running_state.json');
export const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

// Blob storage keys
export const BLOB_KEYS = {
  QUEUE: 'post_queue.json',
  HISTORY: 'posted_history.json',
  RUNNING_STATE: 'running_state.json',
  SETTINGS: 'settings.json',
};