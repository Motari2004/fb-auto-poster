'use client';

import { useState, useEffect, useCallback } from 'react';
import './globals.css';

export default function Home() {
  const [status, setStatus] = useState(null);
  const [queue, setQueue] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [previewPost, setPreviewPost] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showManualPost, setShowManualPost] = useState(false);
  const [manualContent, setManualContent] = useState('');
  const [manualImage, setManualImage] = useState('');
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [postedNotification, setPostedNotification] = useState(null);
  const [settings, setSettings] = useState({ postIntervalMinutes: 15 });
  const [newInterval, setNewInterval] = useState('15');

  // Fetch status
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/status');
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      setStatus(data);
      return data;
    } catch (error) {
      console.error('Error fetching status:', error);
      return null;
    }
  }, []);

  // Fetch queue
  const fetchQueue = useCallback(async () => {
    try {
      const res = await fetch('/api/queue');
      const data = await res.json();
      setQueue(data.queue || []);
      return data.queue || [];
    } catch (error) {
      console.error('Error fetching queue:', error);
      return [];
    }
  }, []);

  // Fetch history
  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/history');
      const data = await res.json();
      
      if (history.length > 0 && data.history && data.history.length > history.length) {
        const newPost = data.history[0];
        if (newPost) {
          const content = newPost.content || 'Image post';
          const source = newPost.source_name || '';
          showPostedNotification(`✅ Posted from ${source}: ${content.substring(0, 40)}${content.length > 40 ? '...' : ''}`);
        }
      }
      
      setHistory(data.history || []);
      return data.history || [];
    } catch (error) {
      console.error('Error fetching history:', error);
      return [];
    }
  }, [history.length]);

  // Fetch settings
  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.success) {
        setSettings(data.settings);
        setNewInterval(String(data.settings.postIntervalMinutes || 15));
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  }, []);

  // Show green posted notification
  const showPostedNotification = (message) => {
    setPostedNotification(message);
    setTimeout(() => {
      setPostedNotification(null);
    }, 5000);
  };

  // Load all data
  const loadData = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchStatus(), fetchQueue(), fetchHistory(), fetchSettings()]);
    setLoading(false);
  }, [fetchStatus, fetchQueue, fetchHistory, fetchSettings]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Actions
 const startScheduler = async () => {
  if (isStarting) return;
  setIsStarting(true);
  showToast('🔄 Starting auto-poster...', 'info');
  
  try {
    const res = await fetch('/api/start', { method: 'POST' });
    const data = await res.json();
    
    if (data.success) {
      showToast('✅ Auto-poster started!', 'success');
      // Force refresh status immediately
      await fetchStatus();
      await fetchQueue();
      await fetchHistory();
      // Also force a re-render by updating a state
      setStatus(prev => ({ ...prev, running: true }));
    } else {
      showToast('❌ ' + data.error, 'error');
    }
  } catch (error) {
    showToast('Error: ' + error.message, 'error');
  } finally {
    setIsStarting(false);
  }
};
  const stopScheduler = async () => {
    if (!confirm('Stop the auto-poster?')) return;
    if (isStopping) return;
    
    setIsStopping(true);
    showToast('🔄 Stopping auto-poster...', 'info');
    
    try {
      const res = await fetch('/api/stop', { method: 'POST' });
      const data = await res.json();
      
      if (data.success) {
        showToast('⏹️ Auto-poster stopped', 'info');
        await fetchStatus();
        await fetchQueue();
        await fetchHistory();
      } else {
        showToast('❌ ' + data.error, 'error');
      }
    } catch (error) {
      showToast('Error: ' + error.message, 'error');
    } finally {
      setIsStopping(false);
    }
  };

  const postNow = async (postId) => {
    if (!confirm('Post this item now?')) return;
    try {
      const res = await fetch('/api/post-now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_id: postId })
      });
      const data = await res.json();
      showToast(data.message, data.success ? 'success' : 'error');
      if (data.success) {
        showPostedNotification(`✅ Posted successfully!`);
      }
      await loadData();
    } catch (error) {
      showToast('Error: ' + error.message, 'error');
    }
  };

  const removeFromQueue = async (postId) => {
    if (!confirm('Remove this post from queue?')) return;
    try {
      const res = await fetch('/api/remove-from-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_id: postId })
      });
      const data = await res.json();
      showToast(data.message, 'info');
      fetchQueue();
    } catch (error) {
      showToast('Error: ' + error.message, 'error');
    }
  };

  const clearQueue = async () => {
    if (!confirm('⚠️ Delete ALL posts from queue?')) return;
    try {
      const res = await fetch('/api/clear-queue', { method: 'POST' });
      const data = await res.json();
      showToast(data.message, 'info');
      fetchQueue();
    } catch (error) {
      showToast('Error: ' + error.message, 'error');
    }
  };

  const updateInterval = async () => {
    const minutes = parseInt(newInterval);
    if (isNaN(minutes) || minutes < 1) {
      showToast('Please enter a valid number (minimum 1 minute)', 'error');
      return;
    }
    
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postIntervalMinutes: minutes })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`✅ Post interval updated to ${minutes} minutes!`, 'success');
        setSettings(data.settings);
        await loadData();
      } else {
        showToast('❌ ' + data.error, 'error');
      }
    } catch (error) {
      showToast('Error: ' + error.message, 'error');
    }
  };

  // Preview - Reads directly from queue state
  const openPreview = (postId) => {
    try {
      const post = queue.find(p => p.id === postId);
      
      if (!post) {
        showToast('Post not found in queue', 'error');
        return;
      }
      
      setPreviewPost({
        id: post.id,
        text: post.text || '',
        images: post.images || [],
        scheduled_time: post.scheduled_time_kenya || 'Not scheduled',
        position: post.position || 'Unknown',
        reactions: post.reactions || 0,
        comments: post.comments || 0,
        shares: post.shares || 0,
        post_link: post.post_link || '',
        source: post.source_name || 'Unknown'
      });
      setShowPreview(true);
    } catch (error) {
      console.error('Preview error:', error);
      showToast('Error: ' + error.message, 'error');
    }
  };

  // Toast notification
  const showToast = (message, type = 'info') => {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('hide');
      setTimeout(() => toast.remove(), 400);
    }, 4000);
  };

  const isRunning = status?.running === true;

  if (loading && !status) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '50px' }}>
        <h2>Loading...</h2>
      </div>
    );
  }

  return (
    <div className="container">
      {/* Green Posted Notification */}
      {postedNotification && (
        <div className="posted-toast">
          <span className="posted-icon">✅</span>
          <span className="posted-message">{postedNotification}</span>
        </div>
      )}

      {/* Header */}
      <div className="header">
        <h1>
          🚀 Facebook Auto-Poster
          <span className={`status-badge ${isRunning ? 'status-running' : 'status-paused'}`}>
            {isRunning ? '🟢 Running' : '⏸️ Paused'}
          </span>
        </h1>
        <p>
          📱 Sources:{' '}
          {status?.sources?.map((s, i) => (
            <span key={s.id}>
              {s.name}
              {i < status.sources.length - 1 ? ' • ' : ''}
            </span>
          ))}
        </p>
        <div style={{ fontSize: '12px', color: '#aaa', marginTop: '5px' }}>
          Debug: running={String(isRunning)} | queue={status?.queue_size || 0} | posted={status?.posts_posted || 0}
        </div>
      </div>

      {/* Dashboard */}
      <div className="card">
        <h2>📊 Dashboard</h2>
        <div className="stats-grid">
          <div className="stat-box">
            <span className="icon">📥</span>
            <div className="number">{status?.queue_size || 0}</div>
            <div className="label">Queue Size</div>
          </div>
          <div className="stat-box">
            <span className="icon">✅</span>
            <div className="number">{status?.posts_posted || 0}</div>
            <div className="label">Posts Posted</div>
          </div>
          <div className="stat-box">
            <span className="icon">📡</span>
            <div className="number">{status?.fetch_interval_hours || 2}h</div>
            <div className="label">Fetch Every</div>
          </div>
          <div className="stat-box">
            <span className="icon">📤</span>
            <div className="number">{status?.post_interval_minutes || 15}m</div>
            <div className="label">Post Every</div>
          </div>
        </div>
        <div style={{ marginTop: '10px', fontSize: '14px', color: '#555' }}>
          <span>🔄 Status: <strong style={{ color: isRunning ? '#28a745' : '#ffc107' }}>
            {isRunning ? '🟢 Running' : '⏸️ Paused'}
          </strong></span>
          <span style={{ marginLeft: '15px' }}>📋 Queue: {status?.queue_size || 0} posts</span>
          <span style={{ marginLeft: '15px' }}>✅ Posted: {status?.posts_posted || 0} posts</span>
          {status?.next_post && (
            <span style={{ marginLeft: '15px' }}>
              ⏰ Next: {status.next_post.scheduled_time} ({status.next_post.source})
            </span>
          )}
          <br />
          <span style={{ marginLeft: '15px' }}>📡 Last Fetch: {status?.last_fetch_time || 'Never'}</span>
          <span style={{ marginLeft: '15px' }}>⏰ Next Fetch: {status?.next_fetch_time || 'Calculating...'}</span>
          <br />
          <span style={{ fontSize: '12px', color: '#888' }}>
            ⏰ Kenya Time: {status?.kenya_time}
          </span>
        </div>
      </div>

      {/* Settings */}
      <div className="card">
        <h2>
          ⚙️ Settings
          <span className="badge">Post Interval: {settings.postIntervalMinutes || 15}m</span>
        </h2>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <label style={{ fontWeight: '600', marginRight: '10px' }}>Post Every:</label>
            <input
              type="number"
              min="1"
              max="60"
              value={newInterval}
              onChange={(e) => setNewInterval(e.target.value)}
              style={{
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                width: '80px',
                fontSize: '14px'
              }}
            />
            <span style={{ marginLeft: '5px' }}>minutes</span>
          </div>
          <button 
            className="btn btn-primary" 
            onClick={updateInterval}
            style={{ flex: 'none', padding: '8px 20px' }}
          >
            Update Interval
          </button>
          <button 
            className="btn btn-secondary" 
            onClick={loadData}
            style={{ flex: 'none', padding: '8px 20px' }}
          >
            🔄 Refresh
          </button>
        </div>
        <div style={{ marginTop: '10px', fontSize: '12px', color: '#888' }}>
          Current: Posts every {settings.postIntervalMinutes || 15} minutes
          {status?.running && ' (Auto-poster is running)'}
        </div>
      </div>

      {/* Controls - Removed Manual Post and Fetch Now */}
      <div className="card">
        <h2>🎮 Admin Controls</h2>
        <div className="controls-row">
          <button 
            className="btn btn-success" 
            onClick={startScheduler} 
            disabled={isRunning || isStarting}
          >
            {isStarting ? '⏳ Starting...' : '▶️ Start Auto'}
          </button>
          <button 
            className="btn btn-danger" 
            onClick={stopScheduler} 
            disabled={!isRunning || isStopping}
          >
            {isStopping ? '⏳ Stopping...' : '⏹️ Stop Auto'}
          </button>
          <button className="btn btn-secondary" onClick={clearQueue}>🗑️ Clear Queue</button>
        </div>
      </div>

      {/* Queue */}
      <div className="card">
        <h2>
          📋 Post Queue
          <span className="badge">{queue.length}</span>
        </h2>
        <div className="queue-container">
          {queue.length === 0 ? (
            <div className="queue-empty">
              <span className="big-icon">📭</span>
              Queue is empty. Waiting for auto-fetch...
            </div>
          ) : (
            queue.map((post, index) => {
              const text = post.text || '📷 Image Post';
              const shortText = text.length > 80 ? text.substring(0, 80) + '...' : text;
              const images = post.images || [];
              const hasImages = images.length > 0;
              const sourceName = post.source_name || 'Unknown';
              const sourceEmoji = sourceName.includes('Unexpressed') ? '💖' :
                sourceName.includes('Billionaire') ? '💎' : '💫';
              const isPosted = post.is_posted || false;
              
              let scheduledTime = post.scheduled_time_kenya || '';
              const timeOnly = scheduledTime.includes(',') ? scheduledTime.split(',')[1]?.trim() || scheduledTime : scheduledTime;

              return (
                <div key={post.id} className="queue-item">
                  <div className="content">
                    <div className="text">{shortText}</div>
                    <div className="meta">
                      {sourceEmoji} {sourceName}
                      {hasImages ? `| 🖼️ ${images.length} images` : '| 📝 Text only'}
                      {timeOnly && !isPosted ? `| ⏰ ${timeOnly}` : ''}
                      {isPosted ? `| ✅ Posted` : `| Position: ${post.position || index + 1}`}
                    </div>
                    {hasImages && (
                      <div className="images-preview">
                        {images.slice(0, 3).map((img, i) => (
                          <img key={i} src={img} alt="image" />
                        ))}
                        {images.length > 3 && <span>+{images.length - 3}</span>}
                      </div>
                    )}
                  </div>
                  <div className="actions">
                    {isPosted ? (
                      <button className="btn btn-success btn-sm" disabled style={{ opacity: 0.6 }}>
                        ✅ Posted
                      </button>
                    ) : (
                      <>
                        <button className="btn btn-info btn-sm" onClick={() => openPreview(post.id)}>👁️ Preview</button>
                        <button className="btn btn-success btn-sm" onClick={() => postNow(post.id)}>📤 Post</button>
                        <button className="btn btn-danger btn-sm" onClick={() => removeFromQueue(post.id)}>✖</button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* History */}
      <div className="card">
        <h2>
          📜 Recent Posts
          <span className="badge">{history.length}</span>
        </h2>
        {history.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#888', padding: '20px' }}>
            No posts posted yet
          </div>
        ) : (
          history.slice(0, 10).map((h) => (
            <div key={h.post_id} className="history-item">
              <div className="h-content">
                {h.source_name ? `📱 ${h.source_name}: ` : ''}{h.content || '📷 Image Post'}
                <span style={{ 
                  display: 'inline-block', 
                  background: '#28a745', 
                  color: 'white', 
                  padding: '1px 10px', 
                  borderRadius: '12px', 
                  fontSize: '10px', 
                  fontWeight: '600',
                  marginLeft: '8px'
                }}>
                  ✅ Posted
                </span>
              </div>
              <div className="h-meta">
                {h.posted_at_kenya || new Date(h.posted_at).toLocaleString()}
                {h.post_url && (
                  <>
                    {' | '}
                    <a className="h-link" href={h.post_url} target="_blank" rel="noopener noreferrer">
                      View Post
                    </a>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Preview Modal */}
      <div className={`modal preview-modal ${showPreview ? 'active' : ''}`}>
        <div className="modal-content">
          <h3>📄 Post Preview</h3>
          {previewPost && (
            <div className="preview-content">
              <div className="preview-text">{previewPost.text || '📷 Image Post (No text)'}</div>
              {previewPost.images && previewPost.images.length > 0 ? (
                <div className="preview-images">
                  {previewPost.images.map((img, i) => (
                    <img key={i} src={img} alt="Post image" />
                  ))}
                </div>
              ) : (
                <div className="preview-empty">No images in this post</div>
              )}
              <div className="preview-meta">
                <span>📱 Source: {previewPost.source || 'Unknown'}</span>
                <span>📅 Scheduled: {previewPost.scheduled_time || 'Not scheduled'}</span>
                <span>📍 Position: {previewPost.position || 'Unknown'}</span>
                {previewPost.reactions && <span>❤️ {previewPost.reactions} reactions</span>}
                {previewPost.comments && <span>💬 {previewPost.comments} comments</span>}
                {previewPost.shares && <span>🔄 {previewPost.shares} shares</span>}
                {previewPost.post_link && (
                  <span>
                    <a href={previewPost.post_link} target="_blank" rel="noopener noreferrer">🔗 Original Post</a>
                  </span>
                )}
              </div>
              <div className="preview-actions">
                <button className="btn btn-secondary" onClick={() => setShowPreview(false)}>Close</button>
                <button
                  className="btn btn-success"
                  onClick={() => {
                    if (previewPost.id) {
                      postNow(previewPost.id);
                      setShowPreview(false);
                    }
                  }}
                >
                  📤 Post Now
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}