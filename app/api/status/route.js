import { NextResponse } from 'next/server';
import { autoPoster } from '../../../lib/scheduler.js';

export async function GET() {
  try {
    // Ensure initialized
    if (!autoPoster.initialized) {
      await autoPoster.initialize();
    }
    
    // Get status from memory, not from blob
    const status = autoPoster.getStatus();
    console.log(`📊 Status API - Running: ${status.running} (from memory)`);
    return NextResponse.json(status);
  } catch (error) {
    console.error('Status error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}