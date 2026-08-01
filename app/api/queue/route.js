import { NextResponse } from 'next/server';
import { dataManager } from '../../../lib/data-manager.js';

export async function GET() {
  try {
    console.log('📊 Queue API - Reading queue from storage...');
    const queue = await dataManager.readQueue();
    console.log(`📊 Queue API - Found ${queue.length} posts`);
    
    // Log first post for debugging
    if (queue.length > 0) {
      console.log('📊 First post:', queue[0].id, queue[0].scheduled_time_kenya);
    }
    
    const queueWithStatus = queue.map((post, index) => ({
      ...post,
      position: index + 1,
      is_posted: post.is_posted || false,
      posted_at_kenya: post.posted_at_kenya || null
    }));
    
    return NextResponse.json({ queue: queueWithStatus });
  } catch (error) {
    console.error('Queue error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}