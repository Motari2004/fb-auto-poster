import axios from 'axios';
import fs from 'fs-extra';
import path from 'path';
import { SOCIAL_API_TOKEN, SOURCE_ACCOUNTS, POST_QUEUE_FILE, POSTED_HISTORY_FILE, MAX_POSTS_PER_FETCH } from './config.js';
import { formatKenyaDateTime, convertToKenyaTime } from './time-utils.js';

export async function fetchFacebookPosts(limit = 9) {
  const allPosts = [];
  const usedIds = new Set();
  const perSourceLimit = limit;

  // Load existing IDs
  let existingIds = new Set();
  try {
    if (await fs.pathExists(POST_QUEUE_FILE)) {
      const queue = await fs.readJson(POST_QUEUE_FILE);
      queue.forEach(item => existingIds.add(item.id));
    }
    if (await fs.pathExists(POSTED_HISTORY_FILE)) {
      const history = await fs.readJson(POSTED_HISTORY_FILE);
      history.forEach(item => existingIds.add(item.post_id));
    }
  } catch (error) {
    console.error('Error loading existing IDs:', error);
  }

  const sortedSources = [...SOURCE_ACCOUNTS].sort((a, b) => a.priority - b.priority);

  console.log(`  📡 Fetching ${perSourceLimit} posts from EACH of ${sortedSources.length} sources...`);

  for (const source of sortedSources) {
    const sourceName = source.name;
    const sourceUrl = source.url;
    const sourcePriority = source.priority;

    console.log(`    📋 ${sourceName} (Priority ${sourcePriority})...`);

    const posts = await fetchFromSource(sourceUrl, perSourceLimit);

    if (!posts || posts.length === 0) {
      console.log(`      📭 No posts from ${sourceName}`);
      continue;
    }

    const newPosts = [];
    for (const post of posts) {
      const postId = post.id;
      if (postId && !existingIds.has(postId) && !usedIds.has(postId)) {
        post.source_id = source.id;
        post.source_name = sourceName;
        post.source_url = sourceUrl;
        post.source_priority = sourcePriority;
        newPosts.push(post);
        usedIds.add(postId);
        existingIds.add(postId);
      }
    }

    if (newPosts.length > 0) {
      console.log(`      ✅ Found ${newPosts.length} NEW posts from ${sourceName}`);
      allPosts.push(...newPosts);
    } else {
      if (posts.length > 0) {
        console.log(`      ⏭️ Found ${posts.length} posts but all are already in queue/history`);
      } else {
        console.log(`      📭 No posts from ${sourceName}`);
      }
    }
  }

  allPosts.sort((a, b) => {
    if (a.time_original && b.time_original) {
      return new Date(b.time_original) - new Date(a.time_original);
    }
    return 0;
  });

  console.log(`  📊 Total: ${allPosts.length} unique new posts collected from all sources`);
  return allPosts;
}

async function fetchFromSource(pageUrl, limit = 9) {
  const url = 'https://api.socialapis.io/facebook/pages/posts';
  const headers = { 'x-api-token': SOCIAL_API_TOKEN };
  const params = { link: pageUrl, limit };

  try {
    const response = await axios.get(url, { headers, params, timeout: 30000 });

    if (response.status === 200) {
      const result = response.data;
      const postsData = result.data || {};
      const posts = postsData.posts || [];

      if (posts.length === 0) return [];

      const formattedPosts = [];
      for (const post of posts) {
        const details = post.details || {};
        const values = post.values || {};
        const reactions = post.reactions || {};

        let text = values.text || '';
        if (typeof text !== 'string') text = String(text);
        text = cleanTextStrong(text);

        const publishTime = values.publish_time;
        const kenyaTimeStr = formatTimeToKenya(publishTime);
        const imageUrls = extractImageUrls(post);

        formattedPosts.push({
          id: details.post_id || 'N/A',
          text,
          time: kenyaTimeStr,
          time_original: publishTime,
          images: imageUrls || [],
          reactions: reactions.total_reaction_count || 0,
          comments: details.comments_count || 0,
          shares: details.share_count || 0,
          post_link: details.post_link || '',
          fetched_at: formatKenyaDateTime()
        });
      }

      return formattedPosts;
    } else {
      console.log(`      ❌ API Error ${response.status}`);
      return [];
    }
  } catch (error) {
    console.log(`      ❌ Error fetching: ${error.message}`);
    return [];
  }
}

function formatTimeToKenya(timeStr) {
  if (!timeStr || timeStr === 'N/A') return 'N/A';
  try {
    if (timeStr.includes('T')) {
      const dt = new Date(timeStr.replace('Z', '+00:00'));
      const kenyaDt = convertToKenyaTime(dt);
      return kenyaDt.format('DD/MM/YYYY, hh:mm A');
    }
    return timeStr;
  } catch {
    return timeStr;
  }
}

function cleanTextStrong(text) {
  if (!text) return text;

  const quoteChars = ['"', "'", '“', '”', '‘', '’', '`', '´'];
  while (text && quoteChars.includes(text[0])) text = text.slice(1);
  while (text && quoteChars.includes(text[text.length - 1])) text = text.slice(0, -1);

  try {
    if (text.includes('\\u')) {
      text = JSON.parse(`"${text}"`);
    }
  } catch {}

  const replacements = {
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

  for (const [old, newText] of Object.entries(replacements)) {
    text = text.replaceAll(old, newText);
  }

  text = text.replace(/["']/g, '');
  text = text.split(' ').filter(w => w).join(' ');
  return text.trim();
}

function extractImageUrls(post) {
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

  const filteredImages = allImageUrls.filter(url => isValidPostImage(url));

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

function isValidPostImage(url) {
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