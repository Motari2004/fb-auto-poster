import { NextResponse } from 'next/server';
import { autoPoster } from '../../../lib/scheduler.js';
import { dbStateManager } from '../../../lib/db-state-manager.js';

export async function GET() {
  try {
    // Ensure initialized
    if (!autoPoster.initialized) {
      await autoPoster.initialize();
    }
    
    // 🔴 FIX: Read from database as source of truth, but DON'T override it
    // Only use database state if memory state is undefined or null
    const dbRunning = await dbStateManager.getRunningState();
    const schedulerRunning = autoPoster.running;
    
    // Use memory state if available, otherwise use database
    let running;
    if (schedulerRunning !== undefined && schedulerRunning !== null) {
      running = schedulerRunning;
    } else {
      running = dbRunning;
    }
    
    // 🔴 FIX: Don't sync back to database from status check
    // Only sync if there's a mismatch and we're sure it should change
    if (schedulerRunning !== undefined && schedulerRunning !== null && schedulerRunning !== dbRunning) {
      console.log(`🔄 State mismatch: Memory=${schedulerRunning}, DB=${dbRunning}`);
      // Only update database if memory state is explicitly set
      // This prevents the status check from overriding start/stop
      if (schedulerRunning !== false) {
        // If memory says true, update database to true
        await dbStateManager.setRunningState(schedulerRunning);
        console.log(`💾 Synced DB to memory: ${schedulerRunning}`);
      }
      // If memory says false, don't override (keeps last user action)
    }
    
    const status = autoPoster.getStatus();
    
    return NextResponse.json({
      ...status,
      running: running,
      _source: 'Memory',
      _dbState: dbRunning,
      _memoryState: schedulerRunning,
    });
  } catch (error) {
    console.error('❌ Status error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}