import { NextResponse } from 'next/server';
import { autoPoster } from '../../../lib/scheduler.js';
import { dbStateManager } from '../../../lib/db-state-manager.js';

export async function POST() {
  try {
    console.log(`📤 Start API called on Vercel`);
    
    // 🔴 FIX: Set database FIRST, then memory
    // This ensures the state persists across cold starts
    
    // 1. Set database to running
    await dbStateManager.setRunningState(true);
    console.log('💾 Database set to Running');
    
    // 2. Initialize if needed
    if (!autoPoster.initialized) {
      await autoPoster.initialize();
    }
    
    // 3. Set memory to running
    autoPoster.running = true;
    await autoPoster.saveRunningState();
    console.log('💾 Memory set to Running');
    
    // 4. Start the scheduler
    await autoPoster.start();
    
    // 5. Verify
    const dbRunning = await dbStateManager.getRunningState();
    console.log(`📤 After start - DB: ${dbRunning}, Memory: ${autoPoster.running}`);
    
    const status = autoPoster.getStatus();
    
    return NextResponse.json({ 
      success: true, 
      message: '✅ Auto-poster started!',
      running: dbRunning,
      memoryState: autoPoster.running,
      status: status,
    });
  } catch (error) {
    console.error('❌ Start error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}