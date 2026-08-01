import { NextResponse } from 'next/server';
import { autoPoster } from '../../../lib/scheduler.js';

export async function POST() {
  try {
    await autoPoster.clearQueue();
    return NextResponse.json({ 
      success: true, 
      message: 'Queue cleared!' 
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}