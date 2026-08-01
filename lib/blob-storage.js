import { put, list, del } from '@vercel/blob';
import { BLOB_CONFIG } from './config.js';

const BLOB_PREFIX = 'fb-auto-poster';
const BASE_URL = 'https://crkdreaublt9577j.public.blob.vercel-storage.com';

function getBlobConfig() {
  if (!BLOB_CONFIG.token || !BLOB_CONFIG.storeId) {
    console.warn('⚠️ Vercel Blob: Missing credentials, using fallback');
    return null;
  }
  return {
    token: BLOB_CONFIG.token,
    storeId: BLOB_CONFIG.storeId,
  };
}

export function isBlobConfigured() {
  return !!(BLOB_CONFIG.token && BLOB_CONFIG.storeId);
}

export async function readBlob(key) {
  try {
    const config = getBlobConfig();
    if (!config) {
      console.log(`📭 Blob not configured, returning null`);
      return null;
    }

    const blobKey = `${BLOB_PREFIX}/${key}`;
    console.log(`📡 Reading blob: ${blobKey}`);
    
    const { blobs } = await list({ 
      prefix: blobKey,
      ...config
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
    console.error(`Error reading ${key}:`, error.message);
    return null;
  }
}

export async function writeBlob(key, data) {
  try {
    const config = getBlobConfig();
    if (!config) {
      console.warn(`⚠️ Blob not configured, data not saved to blob`);
      return null;
    }

    const blobKey = `${BLOB_PREFIX}/${key}`;
    console.log(`💾 Writing blob: ${blobKey}`);
    
    const blob = await put(blobKey, JSON.stringify(data, null, 2), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
      allowOverwrite: true,
      ...config
    });
    console.log(`✅ Saved ${key} to blob storage`);
    console.log(`🔗 URL: ${blob.url}`);
    return blob;
  } catch (error) {
    console.error(`Error writing ${key}:`, error.message);
    throw error;
  }
}

export async function deleteBlob(key) {
  try {
    const config = getBlobConfig();
    if (!config) return;

    const blobKey = `${BLOB_PREFIX}/${key}`;
    const { blobs } = await list({ 
      prefix: blobKey,
      ...config
    });
    
    for (const blob of blobs) {
      await del(blob.url, config);
    }
    console.log(`🗑️ Deleted ${key} from blob storage`);
  } catch (error) {
    console.error(`Error deleting ${key}:`, error.message);
  }
}

export async function listAllBlobs() {
  try {
    const config = getBlobConfig();
    if (!config) {
      console.log('📭 Blob not configured');
      return [];
    }

    const { blobs } = await list({ 
      prefix: BLOB_PREFIX,
      ...config
    });
    return blobs.map(b => ({
      key: b.pathname.replace(`/${BLOB_PREFIX}/`, ''),
      url: b.url,
      size: b.size,
      uploadedAt: b.uploadedAt,
    }));
  } catch (error) {
    console.error('Error listing blobs:', error.message);
    return [];
  }
}

export async function clearAllBlobs() {
  try {
    const config = getBlobConfig();
    if (!config) return;

    const { blobs } = await list({ 
      prefix: BLOB_PREFIX,
      ...config
    });
    for (const blob of blobs) {
      await del(blob.url, config);
    }
    console.log(`🗑️ Cleared all blobs`);
  } catch (error) {
    console.error('Error clearing blobs:', error.message);
  }
}

export function getPublicBlobUrl(key) {
  const blobKey = `${BLOB_PREFIX}/${key}`;
  return `${BASE_URL}/${blobKey}`;
}