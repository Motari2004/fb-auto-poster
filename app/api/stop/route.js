import { NextResponse } from 'next/server';
import { autoPoster } from '../../../lib/scheduler.js';
import { dbStateManager } from '../../../lib/db-state-manager.js';

export async function POST() {
  try {
    console.log(`📤 Stop API called`);
    
    // Set running state in database FIRST
    await dbStateManager.setRunningState(false);
    console.log('💾 Running state set to FALSE in Neon Database');
    
    // Then stop the scheduler
    await autoPoster.stop();
    
    // Verify state
    const dbRunning = await dbStateManager.getRunningState();
    console.log(`📤 After stop - DB: ${dbRunning}, Scheduler: ${autoPoster.running}`);
    
    const status = autoPoster.getStatus();
    
    return NextResponse.json({ 
      success: true, 
      message: '⏹️ Auto-poster stopped',
      running: dbRunning,
      status: status,
      dbState: dbRunning,
    });
  } catch (error) {
    console.error('❌ Stop error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}