// /api/start/route.js
import { NextResponse } from 'next/server';
import { autoPoster } from '../../../lib/scheduler.js';
import { dbStateManager } from '../../../lib/db-state-manager.js';

export async function POST() {
  try {
    // Update memory state
    autoPoster.running = true;
    
    // Update database
    await dbStateManager.setRunningState(true);
    
    // Save the state
    await autoPoster.saveRunningState();
    
    // Start the scheduler if not already running
    if (!autoPoster.schedulerRunning) {
      await autoPoster.startScheduler();
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Auto-poster started',
      running: true 
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}