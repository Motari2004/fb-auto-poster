import { NextResponse } from 'next/server';
import fs from 'fs-extra';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const QUEUE_FILE = path.join(DATA_DIR, 'post_queue.json');

export async function GET(request, { params }) {
  try {
    const { postId } = params;
    
    // Read the queue file directly - don't import the scheduler
    let queue = [];
    if (await fs.pathExists(QUEUE_FILE)) {
      queue = await fs.readJson(QUEUE_FILE);
    }
    
    const post = queue.find(p => p.id === postId);
    
    if (!post) {
      return NextResponse.json(
        { success: false, error: 'Post not found in queue' },
        { status: 404 }
      );
    }
    
    const images = post.images || [];
    console.log(`🖼️ Preview - Found ${images.length} images for post ${postId}`);
    
    return NextResponse.json({
      success: true,
      post: {
        id: post.id,
        text: post.text || '',
        images: images,
        scheduled_time: post.scheduled_time_kenya || 'Not scheduled',
        position: post.position || 'Unknown',
        reactions: post.reactions || 0,
        comments: post.comments || 0,
        shares: post.shares || 0,
        post_link: post.post_link || '',
        source: post.source_name || 'Unknown'
      }
    });
  } catch (error) {
    console.error('Preview error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}