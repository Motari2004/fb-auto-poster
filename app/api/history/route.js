import { NextResponse } from 'next/server';
import { autoPoster } from '../../../lib/scheduler.js';

export async function GET() {
  try {
    // Use the existing postedHistory directly
    const history = autoPoster.postedHistory || [];
    const recentHistory = history.slice(-20).reverse();
    
    return NextResponse.json({ 
      history: recentHistory,
      total: history.length 
    });
  } catch (error) {
    console.error('History error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}