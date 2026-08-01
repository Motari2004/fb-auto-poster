// /api/status/route.js
import { NextResponse } from 'next/server';
import { autoPoster } from '../../../lib/scheduler.js';
import { dbStateManager } from '../../../lib/db-state-manager.js';

export async function GET() {
  try {
    // Get current memory state first (this is the source of truth for runtime)
    const memoryRunning = autoPoster.running;
    
    // If not initialized, initialize
    if (!autoPoster.initialized) {
      await autoPoster.initialize();
    }
    
    // Get the full status
    const status = autoPoster.getStatus();
    
    // Use memory state as primary source, only check DB if memory is undefined
    let finalRunning = memoryRunning;
    
    if (finalRunning === undefined) {
      // Fallback to database only if memory state is undefined
      const dbRunning = await dbStateManager.getRunningState();
      finalRunning = dbRunning;
      // Sync memory with DB
      autoPoster.running = dbRunning;
      await autoPoster.saveRunningState();
    }
    
    // Return status with running state from memory
    const response = {
      ...status,
      running: finalRunning,
      _memoryState: memoryRunning,
      _source: 'Memory State (primary)',
    };
    
    console.log(`📊 Status API - Memory says: ${memoryRunning}, Returning: ${finalRunning}`);
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('❌ Status error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}