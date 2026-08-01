import { NextResponse } from 'next/server';
import { autoPoster } from '../../../lib/scheduler.js';
import { dbStateManager } from '../../../lib/db-state-manager.js';

export async function POST() {
  try {
    console.log(`📤 Stop API called on Vercel`);
    
    // 🔴 NEW LOGIC: Update memory FIRST, then database
    // Memory is now the source of truth for runtime state
    
    // 1. Stop the scheduler first (prevents any new posts)
    await autoPoster.stop();
    console.log('🛑 Scheduler stopped');
    
    // 2. Update memory state
    autoPoster.running = false;
    await autoPoster.saveRunningState();
    console.log('💾 Memory set to Stopped');
    
    // 3. Update database for persistence (but don't override memory)
    await dbStateManager.setRunningState(false);
    console.log('💾 Database set to Stopped');
    
    // 4. Verify both states
    const dbRunning = await dbStateManager.getRunningState();
    console.log(`📤 After stop - DB: ${dbRunning}, Memory: ${autoPoster.running}`);
    
    // 5. Return status with memory as primary source
    const status = autoPoster.getStatus();
    
    return NextResponse.json({ 
      success: true, 
      message: '⏹️ Auto-poster stopped',
      running: autoPoster.running, // Memory is source of truth
      dbState: dbRunning,
      memoryState: autoPoster.running,
      status: status,
    });
  } catch (error) {
    console.error('❌ Stop error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}