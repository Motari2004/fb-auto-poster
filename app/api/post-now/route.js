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
    
    const result = await autoPoster.postSpecificFromQueue(post_id);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}