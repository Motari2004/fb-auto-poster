import { NextResponse } from 'next/server';
import { autoPoster } from '../../../lib/scheduler.js';

export async function GET() {
  return NextResponse.json({
    running: autoPoster.running,
    initialized: autoPoster.initialized,
    queue_size: autoPoster.postQueue?.length || 0,
    posts_posted: autoPoster.postedHistory?.length || 0,
    timestamp: new Date().toISOString()
  });
}