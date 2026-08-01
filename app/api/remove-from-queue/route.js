import { NextResponse } from 'next/server';
import { autoPoster } from '../../../lib/scheduler.js';

export async function POST(request) {
  try {
    const body = await request.json();
    const { post_id } = body;
    
    if (!post_id) {
      return NextResponse.json(
        { success: false, error: 'Post ID required' },
        { status: 400 }
      );
    }
    
    const removed = await autoPoster.removePostFromQueue(post_id);
    if (removed) {
      return NextResponse.json({ 
        success: true, 
        message: 'Post removed from queue' 
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Post not found in queue' },
        { status: 404 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}