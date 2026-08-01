import { NextResponse } from 'next/server';
import { dataManager } from '../../../lib/data-manager.js';

export async function GET() {
  try {
    const queue = await dataManager.readQueue();
    const history = await dataManager.readHistory();
    const runningState = await dataManager.readRunningState();
    
    const kenyaTime = new Date().toLocaleString('en-KE', { 
      timeZone: 'Africa/Nairobi',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    
    return NextResponse.json({
      running: runningState.running || false,
      initialized: true,
      sources: [
        { id: 'billionaire_vision', name: 'Billionaire Vision', priority: 1 },
        { id: 'unexpressedfeelings', name: 'Unexpressed Feelings', priority: 2 },
        { id: 'lovequotesmedia', name: 'Love Quotes Media', priority: 3 }
      ],
      queue_size: queue.length,
      posts_posted: history.length,
      kenya_time: kenyaTime,
      timezone: 'EAT (GMT+3)',
      fetch_interval_hours: 2,
      post_interval_minutes: 4,
      max_posts_per_fetch: 9,
      next_post: queue.length > 0 && queue[0] ? {
        position: 1,
        scheduled_time: queue[0].scheduled_time_kenya || 'Not scheduled',
        source: queue[0].source_name || 'Unknown'
      } : null,
      last_fetch_time: 'Never',
      next_fetch_time: 'Calculating...'
    });
  } catch (error) {
    console.error('Status error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}