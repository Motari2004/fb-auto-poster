import { NextResponse } from 'next/server';
import { dataManager } from '../../../lib/data-manager.js';
import { listAllBlobs } from '../../../lib/blob-storage.js';

export async function GET() {
  try {
    const blobs = await listAllBlobs();
    const queue = await dataManager.readQueue();
    const history = await dataManager.readHistory();
    const runningState = await dataManager.readRunningState();
    const settings = await dataManager.readSettings();

    return NextResponse.json({
      success: true,
      mode: dataManager.getMode(),
      blobCount: blobs.length,
      blobs: blobs,
      data: {
        queue: queue,
        history: history,
        runningState: runningState,
        settings: settings,
      },
      publicUrls: {
        queue: dataManager.getPublicUrl('post_queue.json'),
        history: dataManager.getPublicUrl('posted_history.json'),
        runningState: dataManager.getPublicUrl('running_state.json'),
        settings: dataManager.getPublicUrl('settings.json'),
      }
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}