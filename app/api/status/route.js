import { NextResponse } from 'next/server';
import { autoPoster } from '../../../lib/scheduler.js';
import { dbStateManager } from '../../../lib/db-state-manager.js';

export async function GET() {
  try {
    // 🔴 FIX: ALWAYS read from database - IGNORE memory state
    // Database is the source of truth
    
    // Get running state from database directly
    const dbRunning = await dbStateManager.getRunningState();
    console.log(`📊 Status API - DB says: ${dbRunning}`);
    
    // 🔴 CRITICAL: Override memory state with database value
    // This ensures the UI shows what's actually in the database
    autoPoster.running = dbRunning;
    await autoPoster.saveRunningState();
    
    // Ensure initialized
    if (!autoPoster.initialized) {
      await autoPoster.initialize();
    }
    
    // Get status but override running with database value
    const status = autoPoster.getStatus();
    
    // 🔴 FORCE the running value to be the database value
    const finalResponse = {
      ...status,
      running: dbRunning, // Force database value
      _dbState: dbRunning,
      _memoryState: autoPoster.running,
      _source: 'Neon Database (forced)',
    };
    
    console.log(`📊 Final Response - Running: ${finalResponse.running}`);
    
    return NextResponse.json(finalResponse);
  } catch (error) {
    console.error('❌ Status error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}