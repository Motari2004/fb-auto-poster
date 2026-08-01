import { NextResponse } from 'next/server';
import { autoPoster } from '../../../lib/scheduler.js';

export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    running: autoPoster.running,
    queue_size: autoPoster.postQueue.length,
    posts_posted: autoPoster.postedHistory.length,
    timestamp: new Date().toISOString()
  });
}