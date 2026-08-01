import path from 'path';

// Environment variables
export const ZERNIO_API_KEY = process.env.ZERNIO_API_KEY;
export const FACEBOOK_PAGE_ID = process.env.FACEBOOK_PAGE_ID;
export const SOCIAL_API_TOKEN = process.env.SOCIAL_API_TOKEN;

// ============================================================
// SCHEDULE SETTINGS (Default values - can be changed from frontend)
// ============================================================
export const DEFAULT_POST_INTERVAL_MINUTES = 15;
export const FETCH_INTERVAL_HOURS = 2;
export const MAX_POSTS_PER_FETCH = 9;
export const QUEUE_MIN_THRESHOLD = 5;

// File paths
export const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
export const POST_QUEUE_FILE = path.join(DATA_DIR, 'post_queue.json');
export const POSTED_HISTORY_FILE = path.join(DATA_DIR, 'posted_history.json');
export const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

// Source accounts
export const SOURCE_ACCOUNTS = [
  {
    id: 'billionaire_vision',
    name: 'Billionaire Vision',
    url: 'https://www.facebook.com/profile.php?id=61590243822144',
    category: 'Motivation',
    priority: 1
  },
  {
    id: 'unexpressedfeelings',
    name: 'Unexpressed Feelings',
    url: 'https://www.facebook.com/UnexpressedFeelings4U',
    category: 'Inspiration',
    priority: 2
  },
  {
    id: 'lovequotesmedia',
    name: 'Love Quotes Media',
    url: 'https://www.facebook.com/lovequotesmedia',
    category: 'Inspiration',
    priority: 3
  }
];