import { NextResponse } from 'next/server';
import { autoPoster } from '../../../lib/scheduler.js';

export async function GET() {
  try {
    // Use the existing postQueue directly - doesn't change state
    const queue = autoPoster.postQueue || [];
    
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