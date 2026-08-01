import { put, get, del, list, head } from '@vercel/blob';

const BLOB_PREFIX = 'fb-auto-poster';

export async function readData(key) {
  try {
    const blobKey = `${BLOB_PREFIX}/${key}`;
    const { blobs } = await list({ prefix: blobKey });
    
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

export async function writeData(key, data) {
  try {
    const blobKey = `${BLOB_PREFIX}/${key}`;
    const blob = await put(blobKey, JSON.stringify(data, null, 2), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
    });
    console.log(`💾 Saved ${key} to blob storage`);
    return blob;
  } catch (error) {
    console.error(`Error writing ${key}:`, error);
    throw error;
  }
}

export async function deleteData(key) {
  try {
    const blobKey = `${BLOB_PREFIX}/${key}`;
    const { blobs } = await list({ prefix: blobKey });
    
    for (const blob of blobs) {
      await del(blob.url);
    }
    console.log(`🗑️ Deleted ${key} from blob storage`);
  } catch (error) {
    console.error(`Error deleting ${key}:`, error);
  }
}

export async function dataExists(key) {
  try {
    const blobKey = `${BLOB_PREFIX}/${key}`;
    const { blobs } = await list({ prefix: blobKey });
    return blobs.length > 0;
  } catch (error) {
    return false;
  }
}