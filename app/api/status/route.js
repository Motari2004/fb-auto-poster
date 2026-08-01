import { NextResponse } from 'next/server';
import { autoPoster } from '../../../lib/scheduler.js';

export async function GET() {
  try {
    // Only initialize if not already initialized (once)
    if (!autoPoster.initialized) {
      await autoPoster.initialize();
    }
    
    // Get status - reads running state, doesn't change it
    const status = autoPoster.getStatus();
    console.log(`📊 Status API - Running: ${status.running}`);
    return NextResponse.json(status);
  } catch (error) {
    console.error('Status error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}