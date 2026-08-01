import { NextResponse } from 'next/server';
import { autoPoster } from '../../../lib/scheduler.js';

// GET current settings
export async function GET() {
  try {
    const settings = {
      postIntervalMinutes: autoPoster.postIntervalMinutes || 15,
      fetchIntervalHours: 2,
      maxPostsPerFetch: 9,
      queueMinThreshold: 5
    };
    return NextResponse.json({ success: true, settings });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST update settings
export async function POST(request) {
  try {
    const body = await request.json();
    const { postIntervalMinutes } = body;
    
    if (!postIntervalMinutes || postIntervalMinutes < 1) {
      return NextResponse.json(
        { success: false, error: 'Invalid interval. Must be at least 1 minute.' },
        { status: 400 }
      );
    }
    
    await autoPoster.updatePostInterval(postIntervalMinutes);
    
    return NextResponse.json({
      success: true,
      message: `Post interval updated to ${postIntervalMinutes} minutes`,
      settings: {
        postIntervalMinutes: postIntervalMinutes,
        fetchIntervalHours: 2,
        maxPostsPerFetch: 9,
        queueMinThreshold: 5
      }
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}