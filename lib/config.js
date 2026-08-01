import path from 'path';

const isVercel = process.env.VERCEL === '1';
const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
const blobStoreId = process.env.BLOB_STORE_ID;

// Use blob storage if token exists
export const USE_BLOB_STORAGE = !!(blobToken && blobStoreId);

// Local file paths (fallback for development)
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

// Blob config for PUBLIC storage
export const BLOB_CONFIG = {
  token: blobToken,
  storeId: blobStoreId,
  access: 'public', // Public storage - anyone with URL can read
};