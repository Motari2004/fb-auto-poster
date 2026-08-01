import { NextResponse } from 'next/server';
import fs from 'fs-extra';
import path from 'path';
import axios from 'axios';

const DATA_DIR = path.join(process.cwd(), 'data');
const HISTORY_FILE = path.join(DATA_DIR, 'posted_history.json');
const FACEBOOK_PAGE_ID = process.env.FACEBOOK_PAGE_ID;
const ZERNIO_API_KEY = process.env.ZERNIO_API_KEY;

async function postToFacebook(content, imageUrl = null) {
  try {
    const response = await axios.post(
      'https://zernio.com/api/v1/posts/create',
      {
        content: content || '📷',
        platforms: [
          {
            platform: 'facebook',
            accountId: FACEBOOK_PAGE_ID
          }
        ],
        publish_now: true
      },
      {
        headers: {
          'Authorization': `Bearer ${ZERNIO_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data && response.data.post) {
      return {
        success: true,
        post_id: response.data.post.field_id,
        url: response.data.post.platforms?.[0]?.platformPostUrl
      };
    }
    return { success: false, error: 'No post data returned' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function formatKenyaTime(date) {
  return date.toLocaleString('en-KE', { 
    timeZone: 'Africa/Nairobi',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { content, image_url } = body;
    
    if (!content && !image_url) {
      return NextResponse.json(
        { success: false, error: 'Content or image URL required' },
        { status: 400 }
      );
    }
    
    console.log(`📝 Manual post: ${content?.slice(0, 50)}...`);
    
    const result = await postToFacebook(content, image_url);
    
    if (result.success) {
      await fs.ensureDir(DATA_DIR);
      
      // Read/write history directly - NO scheduler import
      let history = [];
      if (await fs.pathExists(HISTORY_FILE)) {
        history = await fs.readJson(HISTORY_FILE);
      }
      
      history.push({
        post_id: result.post_id,
        source_name: 'Manual Post',
        posted_at: new Date().toISOString(),
        posted_at_kenya: formatKenyaTime(new Date()),
        post_url: result.url || '',
        content: content || ''
      });
      
      await fs.writeJson(HISTORY_FILE, history, { spaces: 2 });
      console.log(`✅ Manual post published!`);
    }
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Manual post error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}