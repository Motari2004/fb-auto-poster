import { NextResponse } from 'next/server';
import { autoPoster } from '../../../lib/scheduler.js';
import { dbStateManager } from '../../../lib/db-state-manager.js';

export async function GET() {
  try {
    // 🔴 FIX: ALWAYS read from database on Vercel
    // Database is the source of truth, not memory
    
    // Get running state from database
    const dbRunning = await dbStateManager.getRunningState();
    
    // Sync the scheduler's memory state with database
    if (autoPoster.running !== dbRunning) {
      console.log(`🔄 Syncing memory (${autoPoster.running}) to DB (${dbRunning})`);
      autoPoster.running = dbRunning;
      await autoPoster.saveRunningState();
    }
    
    // Ensure initialized
    if (!autoPoster.initialized) {
      await autoPoster.initialize();
    }
    
    // Get status and override running with database value
    const status = autoPoster.getStatus();
    
    console.log(`📊 Status API - Running: ${dbRunning} (from DB)`);
    
    return NextResponse.json({
      ...status,
      running: dbRunning, // 🔴 Force database value
      _source: 'Neon Database (Vercel)',
      _dbState: dbRunning,
      _memoryState: autoPoster.running,
    });
  } catch (error) {
    console.error('❌ Status error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}