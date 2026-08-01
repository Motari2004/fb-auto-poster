import { NextResponse } from 'next/server';
import { autoPoster } from '../../../lib/scheduler.js';
import { dbStateManager } from '../../../lib/db-state-manager.js';

export async function POST() {
  try {
    console.log(`📤 Stop API called on Vercel`);
    
    // 🔴 FIX: Set database FIRST, then memory
    
    // 1. Set database to stopped
    await dbStateManager.setRunningState(false);
    console.log('💾 Database set to Stopped');
    
    // 2. Set memory to stopped
    autoPoster.running = false;
    await autoPoster.saveRunningState();
    console.log('💾 Memory set to Stopped');
    
    // 3. Stop the scheduler
    await autoPoster.stop();
    
    // 4. Verify
    const dbRunning = await dbStateManager.getRunningState();
    console.log(`📤 After stop - DB: ${dbRunning}, Memory: ${autoPoster.running}`);
    
    const status = autoPoster.getStatus();
    
    return NextResponse.json({ 
      success: true, 
      message: '⏹️ Auto-poster stopped',
      running: dbRunning,
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