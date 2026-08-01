import { NextResponse } from 'next/server';
import { autoPoster } from '../../../lib/scheduler.js';

export async function POST() {
  try {
    console.log(`📤 Start API called - Current running: ${autoPoster.running}`);
    
    // Initialize if needed
    if (!autoPoster.initialized) {
      await autoPoster.initialize();
    }
    
    // Start the scheduler (this now requires manual control)
    await autoPoster.start();
    
    console.log(`📤 After start - New running: ${autoPoster.running}`);
    
    const status = autoPoster.getStatus();
    
    return NextResponse.json({ 
      success: true, 
      message: '✅ Auto-poster started!',
      running: autoPoster.running,
      status: status
    });
  } catch (error) {
    console.error('Start error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}