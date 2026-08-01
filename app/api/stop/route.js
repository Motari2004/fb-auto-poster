import { NextResponse } from 'next/server';
import { autoPoster } from '../../../lib/scheduler.js';

export async function POST() {
  try {
    console.log(`📤 Stop API called - Current running: ${autoPoster.running}`);
    
    // Stop the scheduler (this now requires manual control)
    await autoPoster.stop();
    
    console.log(`📤 After stop - New running: ${autoPoster.running}`);
    
    const status = autoPoster.getStatus();
    
    return NextResponse.json({ 
      success: true, 
      message: '⏹️ Auto-poster stopped',
      running: autoPoster.running,
      status: status
    });
  } catch (error) {
    console.error('Stop error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}