import { NextResponse } from 'next/server';
import { autoPoster } from '../../../lib/scheduler.js';

export async function POST() {
  try {
    await autoPoster.checkAllPosts();
    return NextResponse.json({ 
      success: true, 
      message: 'Post attempt completed!' 
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}