import { NextResponse } from 'next/server';
import fs from 'fs-extra';
import path from 'path';
import axios from 'axios';

const DATA_DIR = path.join(process.cwd(), 'data');
const QUEUE_FILE = path.join(DATA_DIR, 'post_queue.json');
const HISTORY_FILE = path.join(DATA_DIR, 'posted_history.json');
const SOCIAL_API_TOKEN = process.env.SOCIAL_API_TOKEN;

const SOURCES = [
  { id: 'billionaire_vision', name: 'Billionaire Vision', url: 'https://www.facebook.com/profile.php?id=61590243822144', priority: 1 },
  { id: 'unexpressedfeelings', name: 'Unexpressed Feelings', url: 'https://www.facebook.com/UnexpressedFeelings4U', priority: 2 },
  { id: 'lovequotesmedia', name: 'Love Quotes Media', url: 'https://www.facebook.com/lovequotesmedia', priority: 3 }
];

const MAX_POSTS_PER_FETCH = 9;
const QUEUE_MIN_THRESHOLD = 5;
const POST_INTERVAL_MINUTES = 3;

async function fetchFromSource(pageUrl, limit = 9) {
  const url = 'https://api.socialapis.io/facebook/pages/posts';
  const headers = { 'x-api-token': SOCIAL_API_TOKEN };
  const params = { link: pageUrl, limit };

  try {
    const response = await axios.get(url, { headers, params, timeout: 30000 });
    if (response.status === 200) {
      const posts = response.data?.data?.posts || [];
      return posts.map(post => ({
        id: post.details?.post_id || 'N/A',
        text: post.values?.text || '',
        images: [],
        time_original: post.values?.publish_time,
        reactions: post.reactions?.total_reaction_count || 0,
        comments: post.details?.comments_count || 0,
        shares: post.details?.share_count || 0,
        post_link: post.details?.post_link || ''
      }));
    }
    return [];
  } catch (error) {
    console.error(`Fetch error: ${error.message}`);
    return [];
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

export async function POST() {
  try {
    await fs.ensureDir(DATA_DIR);
    
    // Read files directly - NO scheduler import
    let queue = [];
    let history = [];
    
    if (await fs.pathExists(QUEUE_FILE)) {
      queue = await fs.readJson(QUEUE_FILE);
    }
    if (await fs.pathExists(HISTORY_FILE)) {
      history = await fs.readJson(HISTORY_FILE);
    }
    
    const existingIds = new Set();
    queue.forEach(item => existingIds.add(item.id));
    history.forEach(item => existingIds.add(item.post_id));
    
    if (queue.length >= QUEUE_MIN_THRESHOLD) {
      return NextResponse.json({ 
        success: true, 
        message: `Queue has ${queue.length} posts, skipping fetch` 
      });
    }
    
    console.log(`📡 Fetching new posts...`);
    
    let allPosts = [];
    const usedIds = new Set();
    
    for (const source of SOURCES) {
      console.log(`  📋 ${source.name}...`);
      const posts = await fetchFromSource(source.url, MAX_POSTS_PER_FETCH);
      
      let newCount = 0;
      for (const post of posts) {
        if (post.id && !existingIds.has(post.id) && !usedIds.has(post.id)) {
          post.source_name = source.name;
          allPosts.push(post);
          usedIds.add(post.id);
          newCount++;
        }
      }
      console.log(`    ✅ Found ${newCount} new posts`);
    }
    
    const newPosts = [];
    const now = new Date();
    
    for (let idx = 0; idx < allPosts.length; idx++) {
      const post = allPosts[idx];
      const scheduledTime = new Date(now);
      scheduledTime.setMinutes(scheduledTime.getMinutes() + (idx + 1) * POST_INTERVAL_MINUTES);
      
      post.scheduled_time = scheduledTime.toISOString();
      post.scheduled_time_kenya = formatKenyaTime(scheduledTime);
      post.position = queue.length + idx + 1;
      post.is_posted = false;
      newPosts.push(post);
    }
    
    if (newPosts.length > 0) {
      queue.push(...newPosts);
      await fs.writeJson(QUEUE_FILE, queue, { spaces: 2 });
      console.log(`✅ Added ${newPosts.length} new posts to queue`);
    } else {
      console.log(`📭 No new posts to add`);
    }
    
    return NextResponse.json({ 
      success: true, 
      message: `Fetched ${newPosts.length} new posts!` 
    });
  } catch (error) {
    console.error('Fetch error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}