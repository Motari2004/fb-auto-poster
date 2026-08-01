import { put, list, del } from '@vercel/blob';
import { BLOB_CONFIG, BLOB_KEYS } from './config.js';

const BLOB_PREFIX = 'fb-auto-poster';

export async function readBlob(key) {
  try {
    const blobKey = `${BLOB_PREFIX}/${key}`;
    console.log(`📡 Reading blob: ${blobKey}`);
    
    const { blobs } = await list({ 
      prefix: blobKey,
      token: BLOB_CONFIG.token,
      storeId: BLOB_CONFIG.storeId,
    });
    
    if (blobs.length === 0) {
      console.log(`📭 No data found for ${key}`);
      return null;
    }
    
    const response = await fetch(blobs[0].url);
    if (!response.ok) {
      throw new Error(`Failed to fetch blob: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`📋 Loaded ${key} from blob storage`);
    return data;
  } catch (error) {
    console.error(`Error reading ${key}:`, error);
    return null;
  }
}

export async function writeBlob(key, data) {
  try {
    const blobKey = `${BLOB_PREFIX}/${key}`;
    console.log(`💾 Writing blob: ${blobKey}`);
    
    const blob = await put(blobKey, JSON.stringify(data, null, 2), {
      access: 'private',
      contentType: 'application/json',
      addRandomSuffix: false,
      token: BLOB_CONFIG.token,
      storeId: BLOB_CONFIG.storeId,
    });
    console.log(`✅ Saved ${key} to blob storage`);
    return blob;
  } catch (error) {
    console.error(`Error writing ${key}:`, error);
    throw error;
  }
}

export async function deleteBlob(key) {
  try {
    const blobKey = `${BLOB_PREFIX}/${key}`;
    const { blobs } = await list({ 
      prefix: blobKey,
      token: BLOB_CONFIG.token,
      storeId: BLOB_CONFIG.storeId,
    });
    
    for (const blob of blobs) {
      await del(blob.url, {
        token: BLOB_CONFIG.token,
        storeId: BLOB_CONFIG.storeId,
      });
    }
    console.log(`🗑️ Deleted ${key} from blob storage`);
  } catch (error) {
    console.error(`Error deleting ${key}:`, error);
  }
}

export async function blobExists(key) {
  try {
    const blobKey = `${BLOB_PREFIX}/${key}`;
    const { blobs } = await list({ 
      prefix: blobKey,
      token: BLOB_CONFIG.token,
      storeId: BLOB_CONFIG.storeId,
    });
    return blobs.length > 0;
  } catch (error) {
    return false;
  }
}

export async function listAllBlobs() {
  try {
    const { blobs } = await list({ 
      prefix: BLOB_PREFIX,
      token: BLOB_CONFIG.token,
      storeId: BLOB_CONFIG.storeId,
    });
    return blobs.map(b => ({
      key: b.pathname.replace(`/${BLOB_PREFIX}/`, ''),
      url: b.url,
      size: b.size,
      uploadedAt: b.uploadedAt,
    }));
  } catch (error) {
    console.error('Error listing blobs:', error);
    return [];
  }
}

export async function clearAllBlobs() {
  try {
    const { blobs } = await list({ 
      prefix: BLOB_PREFIX,
      token: BLOB_CONFIG.token,
      storeId: BLOB_CONFIG.storeId,
    });
    for (const blob of blobs) {
      await del(blob.url, {
        token: BLOB_CONFIG.token,
        storeId: BLOB_CONFIG.storeId,
      });
    }
    console.log(`🗑️ Cleared all blobs`);
  } catch (error) {
    console.error('Error clearing blobs:', error);
  }
}