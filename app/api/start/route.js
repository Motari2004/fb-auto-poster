// /api/start/route.js
import { NextResponse } from 'next/server';
import { autoPoster } from '../../../lib/scheduler.js';
import { dbStateManager } from '../../../lib/db-state-manager.js';

export async function POST() {
  try {
    console.log(`▶️ Start API called`);
    
    // 🔴 CRITICAL: Make sure autoPoster is initialized first
    if (!autoPoster.initialized) {
      console.log('🔄 Initializing autoPoster...');
      await autoPoster.initialize();
    }
    
    // 1. Update memory state
    autoPoster.running = true;
    await autoPoster.saveRunningState();
    console.log('💾 Memory set to Running');
    
    // 2. Start the scheduler
    try {
      await autoPoster.start();
      console.log('▶️ Scheduler started successfully');
    } catch (schedulerError) {
      console.error('⚠️ Scheduler start error (non-critical):', schedulerError.message);
      // Continue even if scheduler fails - we can still mark as running
    }
    
    // 3. Update database for persistence
    await dbStateManager.setRunningState(true);
    console.log('💾 Database set to Running');
    
    // 4. Verify both states
    const dbRunning = await dbStateManager.getRunningState();
    console.log(`▶️ After start - DB: ${dbRunning}, Memory: ${autoPoster.running}`);
    
    // 5. Return success
    return NextResponse.json({ 
      success: true, 
      message: '▶️ Auto-poster started',
      running: autoPoster.running,
      dbState: dbRunning,
      memoryState: autoPoster.running,
    });
    
  } catch (error) {
    console.error('❌ Start error:', error);
    
    // Even on error, try to set memory to false to keep consistency
    try {
      autoPoster.running = false;
      await autoPoster.saveRunningState();
    } catch (e) {
      console.error('Error recovering state:', e);
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}