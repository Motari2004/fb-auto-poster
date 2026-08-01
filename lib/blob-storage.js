import { put, list, del } from '@vercel/blob';
import { BLOB_CONFIG } from './config.js';

const BLOB_PREFIX = 'fb-auto-poster';

function getBlobConfig() {
  if (!BLOB_CONFIG.token || !BLOB_CONFIG.storeId) {
    throw new Error('Vercel Blob: Missing credentials');
  }
  return {
    token: BLOB_CONFIG.token,
    storeId: BLOB_CONFIG.storeId,
  };
}

export async function readBlob(key) {
  try {
    const blobKey = `${BLOB_PREFIX}/${key}`;
    console.log(`📡 Reading blob: ${blobKey}`);
    
    const { blobs } = await list({ 
      prefix: blobKey,
      ...getBlobConfig()
    });
    
    if (blobs.length === 0) {
      console.log(`📭 No data found for ${key}`);
      return null;
    }
    
    // For public blobs, we can fetch directly without extra auth
    const response = await fetch(blobs[0].url);
    if (!response.ok) {
      throw new Error(`Failed to fetch blob: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`📋 Loaded ${key} from public blob storage`);
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
      access: 'public', // Public access
      contentType: 'application/json',
      addRandomSuffix: false,
      allowOverwrite: true, // Allow overwriting for updates
      ...getBlobConfig()
    });
    console.log(`✅ Saved ${key} to public blob storage`);
    console.log(`🔗 Public URL: ${blob.url}`);
    return blob;
  } catch (error) {
    console.error(`Error writing ${key}:`, error);
    throw error;
  }
}

export async function deleteBlob(key) {
  try {
    const blobKey = `${BLOB_PREFIX}/${key}`;
    const config = getBlobConfig();
    
    const { blobs } = await list({ 
      prefix: blobKey,
      ...config
    });
    
    for (const blob of blobs) {
      await del(blob.url, config);
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
      ...getBlobConfig()
    });
    return blobs.length > 0;
  } catch (error) {
    return false;
  }
}

export async function listAllBlobs() {
  try {
    const config = getBlobConfig();
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
    console.error('Error listing blobs:', error);
    return [];
  }
}

export async function clearAllBlobs() {
  try {
    const config = getBlobConfig();
    const { blobs } = await list({ 
      prefix: BLOB_PREFIX,
      ...config
    });
    for (const blob of blobs) {
      await del(blob.url, config);
    }
    console.log(`🗑️ Cleared all blobs`);
  } catch (error) {
    console.error('Error clearing blobs:', error);
  }
}

// Get public URL for a blob (for public access)
export function getPublicBlobUrl(key) {
  const blobKey = `${BLOB_PREFIX}/${key}`;
  // For public blobs, the URL format is:
  // https://{storeId}.public.blob.vercel-storage.com/{key}
  return `https://${BLOB_CONFIG.storeId}.public.blob.vercel-storage.com/${blobKey}`;
}