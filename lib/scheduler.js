import fs from 'fs-extra';
import path from 'path';
import cron from 'node-cron';
import axios from 'axios';
import Zernio from '@zernio/node';
import { dataManager } from './data-manager.js';

// Configuration
const SOURCES = [
  { id: 'billionaire_vision', name: 'Billionaire Vision', url: 'https://www.facebook.com/profile.php?id=61590243822144', priority: 1 },
  { id: 'unexpressedfeelings', name: 'Unexpressed Feelings', url: 'https://www.facebook.com/UnexpressedFeelings4U', priority: 2 },
  { id: 'lovequotesmedia', name: 'Love Quotes Media', url: 'https://www.facebook.com/lovequotesmedia', priority: 3 }
];

const FETCH_INTERVAL_HOURS = 2;
const MAX_POSTS_PER_FETCH = 9;
const QUEUE_MIN_THRESHOLD = 5;
const DEFAULT_POST_INTERVAL_MINUTES = 15;

// Initialize Zernio client
const zernio = new Zernio({
  apiKey: process.env.ZERNIO_API_KEY,
  timeout: 60000
});

// ============================================================
// TEXT CLEANING FUNCTION
// ============================================================

function cleanText(text) {
  if (!text) return '';
  
  let cleaned = text.trim();
  const quoteChars = ['"', "'", '“', '”', '‘', '’', '`', '´'];
  while (cleaned && quoteChars.includes(cleaned[0])) {
    cleaned = cleaned.slice(1);
  }
  while (cleaned && quoteChars.includes(cleaned[cleaned.length - 1])) {
    cleaned = cleaned.slice(0, -1);
  }
  cleaned = cleaned.replace(/["']/g, '');
  
  try {
    if (cleaned.includes('\\u')) {
      cleaned = JSON.parse(`"${cleaned}"`);
    }
  } catch {}
  
  const emojiReplacements = {
    '\\u2764\\ufe0f': '❤️',
    '\\u2764': '❤️',
    '\\ufe0f': '',
    '\\u1f60d': '😍',
    '\\u1f60a': '😊',
    '\\u1f602': '😂',
    '\\u1f64f': '🙏',
    '\\u1f31f': '🌟',
    '\\u1f44d': '👍',
    '\\u1f44f': '👏',
    '\\u1f4a5': '💥',
    '\\u1f4af': '💯',
    '\\u1f499': '💙',
    '\\u1f49a': '💚',
    '\\u1f49b': '💛',
    '\\u1f49c': '💜',
  };
  
  for (const [old, newText] of Object.entries(emojiReplacements)) {
    cleaned = cleaned.replaceAll(old, newText);
  }
  
  cleaned = cleaned.split(' ').filter(w => w).join(' ');
  return cleaned.trim();
}

// ============================================================
// PostJob Class
// ============================================================

class PostJob {
  constructor(postData, callback = null) {
    this.postData = postData;
    this.callback = callback;
    this.postId = postData.id;
    this.isPosted = false;
    this.isRunning = false;
    this.scheduledTime = postData.scheduled_time ? new Date(postData.scheduled_time) : null;
  }

  async postNow() {
    if (this.isPosted || this.isRunning) return;

    try {
      this.isRunning = true;
      console.log(`\n  📍 Post ${this.postId.slice(0, 12)}... is posting now!`);
      console.log(`  📱 Source: ${this.postData.source_name || 'Unknown'}`);
      
      let content = this.postData.text || '';
      content = cleanText(content);
      
      console.log(`  📝 Content: ${(content || 'Image post').slice(0, 50)}...`);
      console.log(`  🖼️ Images: ${(this.postData.images || []).length} found`);

      const FACEBOOK_PAGE_ID = process.env.FACEBOOK_PAGE_ID;
      
      if (!FACEBOOK_PAGE_ID) {
        console.log(`  ⚠️ Missing Facebook Page ID, using simulation mode`);
        const result = {
          success: true,
          post_id: `sim_${Date.now()}`,
          url: `https://facebook.com/sim_${Date.now()}`
        };
        this.isPosted = true;
        if (this.callback) {
          await this.callback(this.postId, result);
        }
        return result;
      }

      if (!content || content.trim() === '') {
        content = '📷';
      }

      const platforms = [
        {
          platform: 'facebook',
          accountId: FACEBOOK_PAGE_ID
        }
      ];

      let mediaItems = [];
      if (this.postData.images && this.postData.images.length > 0) {
        console.log(`  📸 Uploading ${Math.min(this.postData.images.length, 5)} images...`);
        
        for (const imgUrl of this.postData.images.slice(0, 5)) {
          try {
            console.log(`    📥 Downloading: ${imgUrl.slice(0, 60)}...`);
            const imageResponse = await axios.get(imgUrl, {
              responseType: 'arraybuffer',
              timeout: 30000
            });
            
            if (imageResponse.status === 200) {
              const buffer = Buffer.from(imageResponse.data);
              const contentType = imageResponse.headers['content-type'] || 'image/jpeg';
              const ext = contentType.includes('png') ? 'png' : 'jpg';
              const filename = `image_${Date.now()}.${ext}`;

              console.log(`    📤 Getting presigned URL...`);
              const { data: presign } = await zernio.media.getMediaPresignedUrl({
                body: { 
                  filename: filename,
                  contentType: contentType 
                }
              });

              console.log(`    📤 Uploading to presigned URL...`);
              await fetch(presign.uploadUrl, {
                method: 'PUT',
                body: buffer,
                headers: { 'Content-Type': contentType }
              });

              mediaItems.push({
                url: presign.publicUrl,
                type: 'image'
              });
              console.log(`    ✅ Image uploaded successfully`);
            }
          } catch (error) {
            console.error(`    ⚠️ Could not upload image: ${error.message}`);
          }
        }
      }

      console.log(`  📤 Creating post on Facebook...`);
      
      const postBody = {
        content: content,
        platforms: platforms,
        publishNow: true
      };

      if (mediaItems.length > 0) {
        postBody.mediaItems = mediaItems;
        console.log(`  📸 ${mediaItems.length} images attached to post`);
      }

      const { data } = await zernio.posts.createPost({
        body: postBody
      });

      if (data && data.post) {
        const result = {
          success: true,
          post_id: data.post.field_id || data.post.id || `post_${Date.now()}`,
          url: data.post.platforms?.[0]?.platformPostUrl || 
               data.post.url || 
               `https://facebook.com/post_${Date.now()}`,
          content: this.postData.text || '',
          source_name: this.postData.source_name || 'Unknown'
        };
        
        console.log(`  ✅ Posted! ID: ${result.post_id}`);
        console.log(`  🔗 URL: ${result.url}`);
        
        this.isPosted = true;
        
        if (this.callback) {
          await this.callback(this.postId, result);
        }
        
        return result;
      } else {
        throw new Error('No post data returned from Zernio API');
      }

    } catch (error) {
      console.error(`  ❌ Error posting:`, error.message);
      
      console.log(`  🔄 Falling back to simulation mode`);
      const result = {
        success: true,
        post_id: `sim_${Date.now()}`,
        url: `https://facebook.com/sim_${Date.now()}`,
        source_name: this.postData.source_name || 'Unknown'
      };
      this.isPosted = true;
      if (this.callback) {
        await this.callback(this.postId, result);
      }
      return result;
    } finally {
      this.isRunning = false;
    }
  }
}

// ============================================================
// AutoPoster Class - Full Manual Control
// ============================================================

class AutoPoster {
  constructor() {
    this.postQueue = [];
    this.postedHistory = [];
    this.running = false;
    this.initialized = false;
    this.lastFetchTime = null;
    this.nextFetchTime = null;
    this.postJobs = new Map();
    this.cronJobs = [];
    this.isPostingInProgress = false;
    this.postIntervalMinutes = DEFAULT_POST_INTERVAL_MINUTES;
    this.scheduler = null;
    this._isStarting = false;
    this._isStopping = false;
  }

  // ============================================================
  // DATA MANAGEMENT
  // ============================================================

  async loadQueue() {
    try {
      this.postQueue = await dataManager.readQueue();
      console.log(`📋 Loaded ${this.postQueue.length} posts from queue`);
    } catch (error) {
      console.error('Error loading queue:', error);
      this.postQueue = [];
    }
    return this.postQueue;
  }

  async saveQueue() {
    try {
      await dataManager.writeQueue(this.postQueue);
      console.log(`💾 Saved ${this.postQueue.length} posts to queue`);
    } catch (error) {
      console.error('Error saving queue:', error);
    }
  }

  async loadHistory() {
    try {
      this.postedHistory = await dataManager.readHistory();
      console.log(`📋 Loaded ${this.postedHistory.length} history entries`);
    } catch (error) {
      console.error('Error loading history:', error);
      this.postedHistory = [];
    }
    return this.postedHistory;
  }

  async saveHistory() {
    try {
      await dataManager.writeHistory(this.postedHistory);
      console.log(`💾 Saved ${this.postedHistory.length} history entries`);
    } catch (error) {
      console.error('Error saving history:', error);
    }
  }

async loadRunningState() {
  try {
    const state = await dataManager.readRunningState();
    // Don't force reset - only set if not already initialized
    if (this.running === undefined || this.running === null) {
      this.running = state.running || false;
    }
    console.log(`📋 Running state: ${this.running ? 'Running' : 'Stopped'}`);
    return this.running;
  } catch (error) {
    console.error('Error loading running state:', error);
    if (this.running === undefined || this.running === null) {
      this.running = false;
    }
    return this.running;
  }
}

  async saveRunningState() {
    try {
      await dataManager.writeRunningState({ running: this.running });
      console.log(`💾 Saved running state: ${this.running ? 'Running' : 'Stopped'}`);
    } catch (error) {
      console.error('Error saving running state:', error);
    }
  }

  async loadSettings() {
    try {
      const settings = await dataManager.readSettings();
      this.postIntervalMinutes = settings.postIntervalMinutes || DEFAULT_POST_INTERVAL_MINUTES;
      console.log(`📋 Loaded settings: Post every ${this.postIntervalMinutes} minutes`);
    } catch (error) {
      console.error('Error loading settings:', error);
      this.postIntervalMinutes = DEFAULT_POST_INTERVAL_MINUTES;
    }
    return this.postIntervalMinutes;
  }

  async saveSettings() {
    try {
      await dataManager.writeSettings({ 
        postIntervalMinutes: this.postIntervalMinutes,
        updated_at: new Date().toISOString()
      });
      console.log(`💾 Saved settings: Post every ${this.postIntervalMinutes} minutes`);
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  }

  async updatePostInterval(minutes) {
    this.postIntervalMinutes = minutes;
    await this.saveSettings();
    await this.updatePositions();
    console.log(`✅ Post interval updated to ${minutes} minutes`);
    return this.postIntervalMinutes;
  }

  // ============================================================
  // QUEUE MANAGEMENT
  // ============================================================

  calculateNextPostTime() {
    const now = new Date();
    const interval = this.postIntervalMinutes || DEFAULT_POST_INTERVAL_MINUTES;
    
    const nextStart = new Date(now);
    nextStart.setMinutes(nextStart.getMinutes() + 1);
    nextStart.setSeconds(0);
    nextStart.setMilliseconds(0);
    
    const minutes = nextStart.getMinutes();
    const nextMinutes = Math.ceil(minutes / interval) * interval;
    
    const nextTime = new Date(nextStart);
    nextTime.setMinutes(nextMinutes, 0, 0);
    
    console.log(`⏰ Next post scheduled: ${this.formatKenyaTime(nextTime)}`);
    
    return nextTime;
  }

  formatKenyaTime(date) {
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

  async addToQueue(posts) {
    const existingIds = new Set();
    this.postQueue.forEach(item => existingIds.add(item.id));
    this.postedHistory.forEach(item => existingIds.add(item.post_id));

    const newPosts = [];
    const baseTime = this.calculateNextPostTime();
    const interval = this.postIntervalMinutes || DEFAULT_POST_INTERVAL_MINUTES;

    for (let idx = 0; idx < posts.length; idx++) {
      const post = posts[idx];
      const postId = post.id;

      if (postId && !existingIds.has(postId)) {
        const scheduledTime = new Date(baseTime);
        scheduledTime.setMinutes(scheduledTime.getMinutes() + idx * interval);

        post.scheduled_time = scheduledTime.toISOString();
        post.scheduled_time_kenya = this.formatKenyaTime(scheduledTime);
        post.position = this.postQueue.length + newPosts.length + 1;

        newPosts.push(post);
        existingIds.add(postId);
      }
    }

    if (newPosts.length > 0) {
      this.postQueue.push(...newPosts);
      await this.saveQueue();

      console.log(`  📥 Added ${newPosts.length} new posts to queue`);
      console.log(`  📤 Post interval: ${interval} minute(s)`);

      for (let i = 0; i < Math.min(newPosts.length, 5); i++) {
        const post = newPosts[i];
        console.log(`    📍 Post ${i + 1}: ${post.source_name || 'Unknown'} - Scheduled for ${post.scheduled_time_kenya}`);
        console.log(`       🖼️ Images: ${(post.images || []).length}`);
      }
      if (newPosts.length > 5) {
        console.log(`    ... and ${newPosts.length - 5} more`);
      }
      console.log(`  📊 Total in queue: ${this.postQueue.length}`);

      await this.createPostJobs(newPosts);
    } else {
      console.log(`  📭 No new posts to add to queue`);
    }

    return newPosts;
  }

  async createPostJobs(posts) {
    for (const post of posts) {
      const postId = post.id;
      if (postId && !this.postJobs.has(postId)) {
        const job = new PostJob(post, this.onPostCompleted.bind(this));
        this.postJobs.set(postId, job);
        console.log(`  🎯 Post ${postId.slice(0, 12)}... scheduled`);
      }
    }
  }

  async onPostCompleted(postId, result) {
    console.log(`  📦 Post ${postId.slice(0, 12)}... completed!`);

    this.postQueue = this.postQueue.filter(p => p.id !== postId);
    await this.saveQueue();

    if (this.postJobs.has(postId)) {
      this.postJobs.delete(postId);
    }

    const historyEntry = {
      post_id: postId,
      source_name: result.source_name || 'Unknown',
      posted_at: new Date().toISOString(),
      posted_at_kenya: this.formatKenyaTime(new Date()),
      post_url: result.url || '',
      content: result.content || ''
    };
    this.postedHistory.push(historyEntry);
    await this.saveHistory();

    await this.updatePositions();
  }

  async updatePositions() {
    if (this.postQueue.length === 0) return;

    const baseTime = this.calculateNextPostTime();
    const interval = this.postIntervalMinutes || DEFAULT_POST_INTERVAL_MINUTES;

    for (let i = 0; i < this.postQueue.length; i++) {
      const post = this.postQueue[i];
      post.position = i + 1;
      const scheduledTime = new Date(baseTime);
      scheduledTime.setMinutes(scheduledTime.getMinutes() + i * interval);
      post.scheduled_time = scheduledTime.toISOString();
      post.scheduled_time_kenya = this.formatKenyaTime(scheduledTime);
    }

    await this.saveQueue();
  }

  // ============================================================
  // IMAGE EXTRACTION METHODS
  // ============================================================

  extractImageUrls(post) {
    const allImageUrls = [];

    const addUrl = (url) => {
      if (url && typeof url === 'string') {
        if (url.startsWith('{"uri":"')) {
          try {
            const parsed = JSON.parse(url);
            url = parsed.uri || url;
          } catch {}
        }
        if (url.startsWith('http') && !allImageUrls.includes(url)) {
          allImageUrls.push(url);
        }
      }
    };

    const values = post.values || {};
    const photoImage = values.photo_image;
    if (photoImage) addUrl(photoImage);

    const details = post.details || {};
    const media = details.media || [];
    if (Array.isArray(media)) {
      for (const item of media) {
        if (typeof item === 'object') {
          ['uri', 'image', 'url', 'src', 'thumbnail'].forEach(field => {
            if (item[field]) addUrl(item[field]);
          });
        }
      }
    }

    const imagesField = details.images || [];
    if (Array.isArray(imagesField)) {
      for (const img of imagesField) {
        if (typeof img === 'string') addUrl(img);
        else if (typeof img === 'object') {
          ['uri', 'url', 'src'].forEach(key => {
            if (img[key]) addUrl(img[key]);
          });
        }
      }
    }

    if (allImageUrls.length === 0) {
      const postStr = JSON.stringify(post);
      const patterns = [
        /https:\/\/[^"]*\.fbcdn\.net[^"]*ctp=s1080x1350[^"]*/gi,
        /https:\/\/[^"]*\.fbcdn\.net[^"]*ctp=s640x640[^"]*/gi,
        /https:\/\/[^"]*\.fbcdn\.net[^"]*ctp=s960x960[^"]*/gi,
        /https:\/\/[^"]*\.fbcdn\.net[^"]*_nc_sid=127cfc[^"]*/gi,
        /https:\/\/[^"]*\.fbcdn\.net[^"]*[^"]*\.(jpg|jpeg|png|gif|webp)[^"]*/gi,
      ];
      for (const pattern of patterns) {
        const matches = postStr.match(pattern);
        if (matches) matches.forEach(url => addUrl(url));
      }
    }

    const filteredImages = allImageUrls.filter(url => this.isValidPostImage(url));

    if (filteredImages.length === 0 && allImageUrls.length > 0) {
      for (const url of allImageUrls) {
        if (url.includes('s1080x1350') || url.includes('s640x640')) {
          filteredImages.push(url);
          break;
        }
      }
      if (filteredImages.length === 0) {
        filteredImages.push(allImageUrls[0]);
      }
    }

    return filteredImages.slice(0, 5);
  }

  isValidPostImage(url) {
    if (!url || typeof url !== 'string') return false;
    const urlLower = url.toLowerCase();

    if (urlLower.includes('ctp=s1080x1350')) return true;
    if (urlLower.includes('ctp=s640x640')) return true;
    if (urlLower.includes('ctp=s960x960')) return true;
    if (urlLower.includes('_nc_sid=127cfc')) return true;

    if (urlLower.includes('fbcdn.net')) {
      if (urlLower.includes('ctp=s80x80')) return false;
      if (urlLower.includes('_nc_sid=2d3e12')) return false;
      if (urlLower.includes('ctp=s64x64')) return false;
      if (urlLower.includes('_nc_sid=e99d92')) return false;
      if (/\.(jpg|jpeg|png|gif|webp)/i.test(urlLower)) return true;
      if (urlLower.includes('ctp=s')) return true;
    }

    return false;
  }

  // ============================================================
  // FETCH FUNCTIONS
  // ============================================================

  async fetchFromSource(pageUrl, limit = 9) {
    const url = 'https://api.socialapis.io/facebook/pages/posts';
    const headers = { 'x-api-token': process.env.SOCIAL_API_TOKEN };
    const params = { link: pageUrl, limit };

    try {
      const response = await axios.get(url, { headers, params, timeout: 30000 });
      if (response.status === 200) {
        const posts = response.data?.data?.posts || [];
        return posts.map(post => {
          const imageUrls = this.extractImageUrls(post);
          const rawText = post.values?.text || '';
          const cleanedText = cleanText(rawText);
          
          return {
            id: post.details?.post_id || 'N/A',
            text: cleanedText,
            images: imageUrls,
            time_original: post.values?.publish_time,
            reactions: post.reactions?.total_reaction_count || 0,
            comments: post.details?.comments_count || 0,
            shares: post.details?.share_count || 0,
            post_link: post.details?.post_link || ''
          };
        });
      }
      return [];
    } catch (error) {
      console.error(`    ❌ Fetch error: ${error.message}`);
      return [];
    }
  }

  async fetchNewPosts() {
    const now = new Date();
    this.lastFetchTime = now;
    this.nextFetchTime = new Date(now);
    this.nextFetchTime.setHours(this.nextFetchTime.getHours() + FETCH_INTERVAL_HOURS);

    const queueSize = this.postQueue.length;

    if (queueSize >= QUEUE_MIN_THRESHOLD) {
      console.log(`\n📊 Queue has ${queueSize} posts (threshold: ${QUEUE_MIN_THRESHOLD})`);
      console.log(`⏸️ Skipping fetch - enough posts`);
      console.log(`⏰ Next fetch at: ${this.formatKenyaTime(this.nextFetchTime)}`);
      return 0;
    }

    console.log(`\n📡 Fetching new posts...`);
    console.log(`📊 Current queue: ${queueSize} posts (below threshold)`);

    let allPosts = [];
    const usedIds = new Set();

    const existingIds = new Set();
    this.postQueue.forEach(item => existingIds.add(item.id));
    this.postedHistory.forEach(item => existingIds.add(item.post_id));

    for (const source of SOURCES) {
      console.log(`  📋 ${source.name} (Priority ${source.priority})...`);
      
      const posts = await this.fetchFromSource(source.url, MAX_POSTS_PER_FETCH);
      
      if (posts.length === 0) {
        console.log(`    📭 No posts`);
        continue;
      }

      const newPosts = [];
      for (const post of posts) {
        if (post.id && !existingIds.has(post.id) && !usedIds.has(post.id)) {
          post.source_name = source.name;
          post.source_id = source.id;
          post.source_priority = source.priority;
          newPosts.push(post);
          usedIds.add(post.id);
          existingIds.add(post.id);
        }
      }

      if (newPosts.length > 0) {
        console.log(`    ✅ Found ${newPosts.length} NEW posts (${newPosts.filter(p => p.images && p.images.length > 0).length} with images)`);
        allPosts.push(...newPosts);
      } else {
        console.log(`    ⏭️ No new posts (${posts.length} found but all duplicates)`);
      }
    }

    allPosts.sort((a, b) => {
      if (a.time_original && b.time_original) {
        return new Date(b.time_original) - new Date(a.time_original);
      }
      return 0;
    });

    console.log(`  📊 Total: ${allPosts.length} unique new posts collected`);

    if (allPosts.length > 0) {
      const newPosts = await this.addToQueue(allPosts);
      console.log(`  ✅ Fetch completed at ${this.formatKenyaTime(new Date())}`);
      console.log(`  📊 New queue size: ${this.postQueue.length} posts`);
      console.log(`  ⏰ Next fetch at: ${this.formatKenyaTime(this.nextFetchTime)}`);
      return newPosts.length;
    } else {
      console.log(`  📭 No new posts to add`);
      return 0;
    }
  }

  // ============================================================
  // POST FUNCTIONS - Only run when manually started
  // ============================================================

  async checkAllPosts() {
    // Only run if running is true AND manually started
    if (!this.running) {
      return;
    }
    
    if (this.isPostingInProgress) return;

    try {
      this.isPostingInProgress = true;

      if (this.postJobs.size === 0) {
        if (this.postQueue.length > 0) {
          await this.createPostJobs(this.postQueue);
        }
        return;
      }

      let postedCount = 0;
      const now = new Date();
      let nextPostTime = null;
      let hasWaitingPosts = false;
      
      for (const [postId, job] of this.postJobs) {
        if (job.isPosted) continue;
        
        if (job.scheduledTime) {
          const timeDiff = (job.scheduledTime - now) / 1000;
          
          if (timeDiff > 5) {
            hasWaitingPosts = true;
            if (!nextPostTime || job.scheduledTime < nextPostTime) {
              nextPostTime = job.scheduledTime;
            }
            continue;
          }
        }
        
        if (!this.running) {
          console.log(`⏸️ Scheduler stopped, skipping remaining posts`);
          break;
        }
        
        console.log(`✅ Time reached! Posting now...`);
        const result = await job.postNow();
        if (result && result.success) postedCount++;
      }

      if (postedCount === 0 && hasWaitingPosts && nextPostTime) {
        const waitSeconds = Math.round((nextPostTime - now) / 1000);
        const waitMinutes = Math.ceil(waitSeconds / 60);
        const waitSecondsRemaining = waitSeconds % 60;
        
        if (waitMinutes > 0) {
          console.log(`⏰ Next post at ${this.formatKenyaTime(nextPostTime)} (in ${waitMinutes}m ${waitSecondsRemaining}s)`);
        } else if (waitSeconds > 5) {
          console.log(`⏰ Next post at ${this.formatKenyaTime(nextPostTime)} (in ${waitSeconds}s)`);
        }
      }

      if (postedCount > 0) {
        await this.updatePositions();
        await this.saveQueue();
      }
    } catch (error) {
      console.error('Error checking posts:', error);
    } finally {
      this.isPostingInProgress = false;
    }
  }

  // ============================================================
  // MANUAL CONTROL FUNCTIONS
  // ============================================================
async initialize() {
  if (this.initialized) return;
  
  await this.loadQueue();
  await this.loadHistory();
  // Don't force reset running state here
  await this.loadSettings();
  
  // Only set initial state if not already set
  if (this.running === undefined || this.running === null) {
    this.running = false;
    await this.saveRunningState();
  }
  
  this.nextFetchTime = new Date();
  this.nextFetchTime.setHours(this.nextFetchTime.getHours() + FETCH_INTERVAL_HOURS);
  this.initialized = true;
  
  console.log(`✅ Auto-poster initialized at ${this.formatKenyaTime(new Date())}`);
  console.log(`📊 Queue: ${this.postQueue.length} posts waiting`);
  console.log(`📊 Status: ${this.running ? '🟢 Running' : '⏸️ Paused'}`);
  console.log(`📊 Post interval: ${this.postIntervalMinutes} minutes`);
  
  if (!this.running) {
    console.log(`🟡 Click 'Start' to begin auto-posting`);
  }
}

  async start() {
    // Prevent multiple start attempts
    if (this._isStarting) {
      console.log(`⏳ Start already in progress...`);
      return;
    }

    if (this.running) {
      console.log(`⚠️ Already running`);
      return;
    }

    this._isStarting = true;

    try {
      if (!this.initialized) {
        await this.initialize();
      }

      // Clear any existing jobs
      this.stopCronJobs();
      this.postJobs.clear();

      // Set running to true
      this.running = true;
      await this.saveRunningState();
      
      console.log(`\n${'='.repeat(60)}`);
      console.log(`✅ Auto-poster STARTED at ${this.formatKenyaTime(new Date())}!`);
      console.log(`📤 Post Interval: Every ${this.postIntervalMinutes} minute(s)`);
      console.log(`${'='.repeat(60)}\n`);

      // Fetch posts if queue is empty
      if (this.postQueue.length === 0) {
        await this.fetchNewPosts();
      } else {
        await this.createPostJobs(this.postQueue);
      }

      // Start cron jobs
      this.startCronJobs();
      
      console.log(`🔴 Running state: ${this.running}`);
      console.log(`⏰ First post will go out at its scheduled time`);
    } catch (error) {
      console.error('Error starting:', error);
      this.running = false;
      await this.saveRunningState();
    } finally {
      this._isStarting = false;
    }
  }

  async stop() {
    // Prevent multiple stop attempts
    if (this._isStopping) {
      console.log(`⏳ Stop already in progress...`);
      return;
    }

    if (!this.running) {
      console.log(`⚠️ Already stopped`);
      // Force save stopped state
      this.running = false;
      await this.saveRunningState();
      return;
    }

    this._isStopping = true;

    try {
      console.log(`🛑 Stopping auto-poster at ${this.formatKenyaTime(new Date())}...`);
      
      // Stop cron jobs immediately
      this.stopCronJobs();
      
      // Set running to false
      this.running = false;
      await this.saveRunningState();
      
      // Clear all post jobs
      this.postJobs.clear();
      this.isPostingInProgress = false;

      console.log(`\n${'='.repeat(60)}`);
      console.log(`🛑 Auto-poster STOPPED at ${this.formatKenyaTime(new Date())}`);
      console.log(`⏸️ Auto-posting is paused`);
      console.log(`📊 Queue: ${this.postQueue.length} posts waiting`);
      console.log(`✅ All cron jobs stopped`);
      console.log(`${'='.repeat(60)}\n`);
    } catch (error) {
      console.error('Error stopping:', error);
    } finally {
      this._isStopping = false;
    }
  }

  startCronJobs() {
    this.stopCronJobs();

    const fetchJob = cron.schedule('0 */2 * * *', async () => {
      // Only fetch if running
      if (this.running) {
        console.log(`\n⏰ Scheduled fetch triggered at ${this.formatKenyaTime(new Date())}`);
        await this.fetchNewPosts();
      } else {
        console.log(`⏸️ Skipping fetch - auto-poster is stopped`);
      }
    });
    this.cronJobs.push(fetchJob);

    const checkJob = cron.schedule('*/10 * * * * *', async () => {
      // Only check posts if running
      if (this.running) {
        await this.checkAllPosts();
      }
    });
    this.cronJobs.push(checkJob);

    console.log(`✅ Cron jobs started (fetch: every ${FETCH_INTERVAL_HOURS}h, check: every 10s)`);
  }

  stopCronJobs() {
    console.log(`🛑 Stopping all cron jobs...`);
    for (const job of this.cronJobs) {
      try {
        job.stop();
      } catch (e) {
        // Ignore errors
      }
    }
    this.cronJobs = [];
    
    try {
      if (this.scheduler) {
        const jobs = this.scheduler.get_jobs();
        for (const job of jobs) {
          this.scheduler.remove_job(job.id);
        }
      }
    } catch (e) {
      // Ignore errors
    }
    
    console.log(`✅ All cron jobs stopped`);
  }

  // ============================================================
  // STATUS & INFO
  // ============================================================

  getStatus() {
    const now = new Date();
    const kenyaTime = this.formatKenyaTime(now);

    if (!this.nextFetchTime) {
      this.nextFetchTime = new Date(now);
      this.nextFetchTime.setHours(this.nextFetchTime.getHours() + FETCH_INTERVAL_HOURS);
    }

    let nextPost = null;
    if (this.postQueue.length > 0 && this.postQueue[0]) {
      nextPost = {
        position: 1,
        scheduled_time: this.postQueue[0].scheduled_time_kenya || 'Not scheduled',
        source: this.postQueue[0].source_name || 'Unknown'
      };
    }

    return {
      running: this.running,
      initialized: this.initialized,
      sources: SOURCES,
      queue_size: this.postQueue.length,
      posts_posted: this.postedHistory.length,
      kenya_time: kenyaTime,
      timezone: 'EAT (GMT+3)',
      fetch_interval_hours: FETCH_INTERVAL_HOURS,
      post_interval_minutes: this.postIntervalMinutes || DEFAULT_POST_INTERVAL_MINUTES,
      max_posts_per_fetch: MAX_POSTS_PER_FETCH,
      next_post: nextPost,
      last_fetch_time: this.lastFetchTime ? this.formatKenyaTime(this.lastFetchTime) : 'Never',
      next_fetch_time: this.nextFetchTime ? this.formatKenyaTime(this.nextFetchTime) : 'Calculating...'
    };
  }

  async getQueue() {
    await this.updatePositions();

    const queueWithInfo = [];
    for (let i = 0; i < this.postQueue.length; i++) {
      const post = { ...this.postQueue[i] };
      post.position = i + 1;
      if (!post.scheduled_time_kenya) {
        const baseTime = this.calculateNextPostTime();
        const scheduledTime = new Date(baseTime);
        scheduledTime.setMinutes(scheduledTime.getMinutes() + i * this.postIntervalMinutes);
        post.scheduled_time_kenya = this.formatKenyaTime(scheduledTime);
      }
      queueWithInfo.push(post);
    }

    return queueWithInfo;
  }

  getHistory(limit = 50) {
    return this.postedHistory.slice(-limit).reverse();
  }
}

// Create singleton instance
const autoPoster = new AutoPoster();

// DO NOT auto-initialize - let the routes call initialize when needed
// autoPoster.initialize().catch(console.error);

export { autoPoster, AutoPoster, PostJob };