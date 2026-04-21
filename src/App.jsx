import React, { useState, useEffect, useRef } from 'react';
import './index.css';
import rawHtml from './landing.html?raw';
import heroHtml from './hero.html?raw';

// Isolated component for static HTML
const StaticLanding = React.memo(() => {
  return (
    <div className="static-content-wrap">
      <div dangerouslySetInnerHTML={{ __html: rawHtml }} />
    </div>
  );
});

const StaticHero = React.memo(() => {
  return (
    <div className="static-content-wrap">
       <div dangerouslySetInnerHTML={{ __html: heroHtml }} />
    </div>
  );
});

function App() {
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('sentinel_active_tab') || 'dashboard';
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [resultUrl, setResultUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [threshold, setThreshold] = useState(0.60);
  const [detections, setDetections] = useState(null);
  const [lightboxSrc, setLightboxSrc] = useState(null);
  const [systemTime, setSystemTime] = useState(new Date().toLocaleTimeString());

  const fileInputRef = useRef(null);

  // Persist tab choice
  useEffect(() => {
    localStorage.setItem('sentinel_active_tab', activeTab);
  }, [activeTab]);

  // Update clock
  useEffect(() => {
    const timer = setInterval(() => setSystemTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Global lightbox logic
  useEffect(() => {
    const handleGlobalClick = (e) => {
      if (e.target.tagName === 'IMG' && 
          !e.target.classList.contains('no-lb') && 
          !e.target.closest('.sidebar') && 
          !e.target.closest('.header-actions')) {
        setLightboxSrc(e.target.src);
      }
    };
    document.addEventListener('click', handleGlobalClick);
    return () => document.removeEventListener('click', handleGlobalClick);
  }, []);

  useEffect(() => {
    if (lightboxSrc) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }, [lightboxSrc]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setResultUrl(null);
      setError(null);
    }
  };

  const handlePredict = async () => {
    if (!selectedFile) return;
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('image', selectedFile);
    formData.append('threshold', threshold.toString());

    let API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    if (API_URL.endsWith('/')) API_URL = API_URL.slice(0, -1);

    try {
      const response = await fetch(`${API_URL}/api/predict`, {
        method: 'POST',
        body: formData,
      });

      const contentType = response.headers.get("content-type");
      if (!response.ok) {
        if (contentType && contentType.includes("application/json")) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Server error');
        } else {
          throw new Error(`Server error (${response.status})`);
        }
      }

      const data = await response.json();
      setResultUrl(data.resultUrl);
      setDetections(data.metadata?.detections || {});
    } catch (err) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const video1Ref = React.useRef(null);
  const video2Ref = React.useRef(null);

  const handlePlayBoth = () => {
    if (video1Ref.current && video2Ref.current) {
      video1Ref.current.currentTime = 0;
      video2Ref.current.currentTime = 0;
      video1Ref.current.play();
      video2Ref.current.play();
    }
  };

  const renderSidebar = () => {
    const navItems = [
      { id: 'dashboard', label: 'Dashboard', icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
      )},
      { id: 'monitor', label: 'Frame Analysis', icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
      )},
      { id: 'analysis', label: 'Video Analysis', icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>
      )},
      { id: 'about', label: 'Docs', icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
      )}
    ];

    return (
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
          </div>
        </div>
        
        <nav className="nav-menu">
          {navItems.map(item => (
            <div 
              key={item.id}
              className={`nav-link ${activeTab === item.id ? 'active' : ''}`} 
              onClick={() => setActiveTab(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="system-status">
            <div className="status-indicator"></div>
            <span>System Online: {systemTime}</span>
          </div>
        </div>
      </aside>
    );
  };

  const renderHeader = (title) => (
    <header className="top-header">
      <div className="header-title">
        <h1>{title}</h1>
      </div>
      <div className="header-actions">
        <div className="search-bar">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <input type="text" placeholder="Search monitoring data..." />
        </div>
        <div style={{width: '1px', height: '24px', background: 'var(--border-subtle)', margin: '0 10px'}}></div>
        <div className="avatar" title="Athithya Krishnaa" style={{width: '32px', height: '32px', background: 'linear-gradient(135deg, var(--bg-high), var(--bg-subtle))', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 'bold', border: '1px solid var(--border-bright)', color: 'var(--accent-primary)', cursor: 'pointer'}}>
          AK
        </div>
      </div>
    </header>
  );

  return (
    <div className={`app-container ${activeTab === 'analysis' ? 'sidebar-mini' : ''}`}>
      {renderSidebar()}

      <main className="main-content">
        {/* Dashboard View */}
        {activeTab === 'dashboard' && (
          <>
            {renderHeader('Dashboard Overview')}
            <div className="view-container animate-in">
              <div className="dashboard-grid">
                <div className="stat-card">
                  <div className="stat-header">
                    <span className="stat-label">Model Accuracy (mAP@50)</span>
                    <div className="stat-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>
                    </div>
                  </div>
                  <div className="stat-value">84.1%</div>
                  <div className="stat-change up">↑ Optimized for RT-DETR</div>
                </div>
                <div className="stat-card">
                  <div className="stat-header">
                    <span className="stat-label">Inference Speed</span>
                    <div className="stat-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
                    </div>
                  </div>
                  <div className="stat-value">12.5 FPS</div>
                  <div className="stat-change up">↑ Stable on T4 GPU</div>
                </div>
                <div className="stat-card">
                  <div className="stat-header">
                    <span className="stat-label">Detection Classes</span>
                    <div className="stat-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
                    </div>
                  </div>
                  <div className="stat-value">4</div>
                  <div className="stat-change">RT-DETRv4-X Base</div>
                </div>
                <div className="stat-card">
                  <div className="stat-header">
                    <span className="stat-label">Training Labels</span>
                    <div className="stat-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
                    </div>
                  </div>
                  <div className="stat-value">12,457</div>
                  <div className="stat-change">Total Annotated Instances</div>
                </div>
              </div>

              <div className="content-section">
                <div className="mon-panel">
                  <div className="panel-header">
                    <div className="panel-title">Recent Activity Logs</div>
                  </div>
                  <div className="panel-body" style={{padding: 0}}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Timestamp</th>
                          <th>Detection Event</th>
                          <th>Confidence</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>{new Date().toLocaleDateString()} 10:42</td>
                          <td>Helmet, Safety Vest</td>
                          <td>98.4%</td>
                          <td><span className="detect-tag success">Compliant</span></td>
                        </tr>
                        <tr>
                          <td>{new Date().toLocaleDateString()} 10:38</td>
                          <td>No Glove, Safety Vest</td>
                          <td>92.1%</td>
                          <td><span className="detect-tag danger">Violation</span></td>
                        </tr>
                        <tr>
                          <td>{new Date().toLocaleDateString()} 10:15</td>
                          <td>Mask, Helmet</td>
                          <td>96.7%</td>
                          <td><span className="detect-tag success">Compliant</span></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="mon-panel">
                  <div className="panel-header">
                    <div className="panel-title">System Health</div>
                  </div>
                  <div className="panel-body">
                    <div style={{marginBottom: '20px'}}>
                      <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.8rem'}}>
                        <span>GPU Load (A100)</span>
                        <span>42%</span>
                      </div>
                      <div style={{height: '6px', background: 'var(--bg-high)', borderRadius: '3px'}}>
                        <div style={{width: '42%', height: '100%', background: 'var(--accent-primary)', borderRadius: '3px'}}></div>
                      </div>
                    </div>
                    <div>
                      <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.8rem'}}>
                        <span>Memory Usage</span>
                        <span>2.4GB</span>
                      </div>
                      <div style={{height: '6px', background: 'var(--bg-high)', borderRadius: '3px'}}>
                        <div style={{width: '24%', height: '100%', background: 'var(--accent-secondary)', borderRadius: '3px'}}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Live Monitor View */}
        {activeTab === 'monitor' && (
          <>
            {renderHeader('Frame Analysis Engine')}
            <div className="view-container animate-in">
              <div className="content-section" style={{gridTemplateColumns: '1fr'}}>
                <div className="mon-panel">
                   <div className="panel-header">
                      <div className="panel-title">Inference Engine</div>
                      <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
                        <span style={{fontSize: '0.8rem', color: 'var(--text-muted)'}}>Confidence: <strong style={{color: 'var(--accent-primary)'}}>{threshold.toFixed(2)}</strong></span>
                        <input 
                            type="range" min="0.1" max="0.95" step="0.05" 
                            value={threshold} 
                            onChange={(e) => setThreshold(parseFloat(e.target.value))} 
                            className="threshold-slider"
                            style={{width: '120px'}}
                        />
                      </div>
                   </div>
                   <div className="panel-body">
                      {!previewUrl ? (
                        <div className="upload-zone" 
                             onClick={() => fileInputRef.current.click()}
                             onDragOver={(e) => e.preventDefault()}
                             onDrop={(e) => {
                               e.preventDefault();
                               if (e.dataTransfer.files?.[0]) handleFileChange({target: {files: e.dataTransfer.files}});
                             }}>
                           <div className="upload-icon">
                              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                           </div>
                           <h3>Drop monitoring frame here</h3>
                           <p style={{color: 'var(--text-dim)'}}>Supports JPG, PNG, WEBP (Max 10MB)</p>
                           <input type="file" hidden ref={fileInputRef} onChange={handleFileChange} accept="image/*" />
                           <button className="secondary-btn" style={{marginTop: '10px'}}>Browse Files</button>
                        </div>
                      ) : (
                        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px'}}>
                           <div className="feed-container">
                              <div className="feed-overlay">
                                <div className="overlay-badge">INPUT_STREAM_01</div>
                                <div className="overlay-badge" style={{borderColor: 'var(--text-dim)'}}>RAW_DATA</div>
                              </div>
                              <img src={previewUrl} alt="Preview" style={{width: '100%', height: '100%', objectFit: 'contain'}} />
                           </div>
                           
                           <div className="feed-container">
                              <div className="feed-overlay">
                                <div className="overlay-badge" style={{borderColor: 'var(--success)'}}>INFERENCE_v4</div>
                                {detections && <div className="overlay-badge" style={{borderColor: 'var(--accent-secondary)'}}>{Object.keys(detections).length} OBJECTS</div>}
                              </div>
                              {loading ? (
                                <div className="processing-indicator">
                                  <div className="loader"></div>
                                  <div style={{marginTop: '80px', position: 'absolute', fontWeight: 'bold', color: 'var(--accent-primary)'}}>PROCESSING...</div>
                                </div>
                              ) : resultUrl ? (
                                <img src={resultUrl} alt="Result" style={{width: '100%', height: '100%', objectFit: 'contain'}} />
                              ) : (
                                <div className="processing-indicator" style={{background: 'rgba(0,0,0,0.5)'}}>
                                  <div style={{color: 'var(--text-dim)'}}>Waiting for execution...</div>
                                </div>
                              )}
                           </div>
                        </div>
                      )}

                      {detections && !loading && (
                        <div style={{marginTop: '24px'}}>
                          <div className="detection-list">
                            {Object.entries(detections).map(([name, count]) => {
                              const isViolation = name.includes('No');
                              return (
                                <div key={name} className={`detect-tag ${isViolation ? 'danger' : 'success'}`}>
                                  <span>{isViolation ? '⚠️' : '✅'}</span>
                                  <span>{count}x {name}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <div style={{marginTop: '32px', display: 'flex', gap: '16px', justifyContent: 'flex-end'}}>
                        <button className="secondary-btn" onClick={() => { setPreviewUrl(null); setResultUrl(null); setSelectedFile(null); setDetections(null); setError(null); }}>Discard</button>
                        <button className="primary-btn" onClick={handlePredict} disabled={loading || !selectedFile}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '8px'}}><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                          {loading ? 'Analyzing...' : 'Run Detection'}
                        </button>
                      </div>
                      {error && (
                        <div style={{ color: 'var(--danger)', marginTop: '1.5rem', fontSize: '0.85rem', padding: '12px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span>❌</span>
                          <span><strong>{error === 'Failed to fetch' ? 'Backend Offline' : 'Inference Error'}:</strong> {error === 'Failed to fetch' ? 'The detection server is currently unreachable. Please ensure the backend is running.' : error}</span>
                        </div>
                      )}
                   </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Video Analysis View */}
        {activeTab === 'analysis' && (
          <>
            {renderHeader('Video Stream Analysis')}
            <div className="view-container animate-in">
              <div className="mon-panel">
                <div className="panel-header">
                  <div className="panel-title">Comparative Tracking Overview</div>
                  <button className="primary-btn" onClick={handlePlayBoth} style={{padding: '8px 16px', fontSize: '0.75rem'}}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '6px'}}><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                    Play Both
                  </button>
                </div>
                <div className="panel-body">
                  <div className="video-grid">
                    <div className="video-card">
                       <div style={{padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-subtle)', fontSize: '0.75rem', fontFamily: 'var(--font-mono)'}}>
                         SOURCE: input_video.mp4
                       </div>
                       <video ref={video1Ref} controls preload="metadata" loop>
                         <source src="input_pics_videos/input_video.mp4" type="video/mp4" />
                       </video>
                    </div>
                    <div className="video-card">
                       <div style={{padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-subtle)', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--success)'}}>
                         OUTPUT: annotated_h264.mp4 [PROCESSED]
                       </div>
                       <video ref={video2Ref} controls preload="metadata" loop>
                         <source src="output_pics_videos/input_video_annotated_h264.mp4" type="video/mp4" />
                       </video>
                    </div>
                  </div>
                  <div style={{marginTop: '20px', padding: '16px', background: 'rgba(0, 242, 255, 0.05)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(0, 242, 255, 0.1)'}}>
                    <p style={{fontSize: '0.85rem', color: 'var(--text-muted)'}}>
                      <strong style={{color: 'var(--accent-primary)'}}>Pipeline Info:</strong> Annotated output generated at 30FPS using RT-DETRv4-X. Total objects tracked: 142. Compliance threshold maintained at 0.45.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* About/Doc View */}
        {activeTab === 'about' && (
          <>
            {renderHeader('System Architecture & Docs')}
            <div className="view-container animate-in">
              <div className="static-docs-grid">
                <StaticHero />
                <StaticLanding />
              </div>
            </div>
          </>
        )}
      </main>

      {/* Lightbox Component */}
      {lightboxSrc && (
        <div className="lightbox active" onClick={() => setLightboxSrc(null)}>
          <button id="lightbox-close" onClick={() => setLightboxSrc(null)}>&times;</button>
          <img src={lightboxSrc} alt="Fullscreen view" className="no-lb" />
        </div>
      )}
    </div>
  );
}

export default App;
