import { NextResponse } from 'next/server';
import { autoPoster } from '../../../lib/scheduler.js';
import { dbStateManager } from '../../../lib/db-state-manager.js';

export async function POST() {
  try {
    console.log(`📤 Start API called`);
    
    // Initialize if needed
    if (!autoPoster.initialized) {
      await autoPoster.initialize();
    }
    
    // Set running state in database FIRST
    await dbStateManager.setRunningState(true);
    console.log('💾 Running state set to TRUE in Neon Database');
    
    // Then start the scheduler
    await autoPoster.start();
    
    // Verify state
    const dbRunning = await dbStateManager.getRunningState();
    console.log(`📤 After start - DB: ${dbRunning}, Scheduler: ${autoPoster.running}`);
    
    const status = autoPoster.getStatus();
    
    return NextResponse.json({ 
      success: true, 
      message: '✅ Auto-poster started!',
      running: dbRunning,
      status: status,
      dbState: dbRunning,
    });
  } catch (error) {
    console.error('❌ Start error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}