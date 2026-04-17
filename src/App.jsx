import React, { useState, useEffect, useRef } from 'react';
import './index.css';
import rawHtml from './landing.html?raw';
import heroHtml from './hero.html?raw';

// Isolated component for static HTML to prevent it from re-rendering
// and destroying vanilla DOM changes (like IntersectionObserver classes)
const StaticLanding = React.memo(() => {
  useEffect(() => {
    const reveals = document.querySelectorAll('.reveal');
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e, i) => {
        if (e.isIntersecting) {
          setTimeout(() => e.target.classList.add('visible'), i * 60);
          obs.unobserve(e.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
    
    reveals.forEach(el => obs.observe(el));

    return () => obs.disconnect();
  }, []);

  return <div dangerouslySetInnerHTML={{ __html: rawHtml }} />;
});

// Extracted Hero to be stay at top
const StaticHero = React.memo(() => {
  return <div dangerouslySetInnerHTML={{ __html: heroHtml }} />;
});

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [resultUrl, setResultUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [threshold, setThreshold] = useState(0.60);
  const [detections, setDetections] = useState(null);
  
  // State for Native React Lightbox
  const [lightboxSrc, setLightboxSrc] = useState(null);

  const fileInputRef = useRef(null);

  // Global click delegator for images to open Lightbox
  useEffect(() => {
    const handleGlobalClick = (e) => {
      // Allow any image click to open lightbox, unless it has 'no-lb' class
      if (e.target.tagName === 'IMG' && !e.target.classList.contains('no-lb')) {
        setLightboxSrc(e.target.src);
      }
    };
    document.addEventListener('click', handleGlobalClick);
    return () => document.removeEventListener('click', handleGlobalClick);
  }, []);

  // Handle escape key to close lightbox
  useEffect(() => {
    const closeLb = () => setLightboxSrc(null);
    const handleKeyDown = (e) => { if (e.key === 'Escape') closeLb(); };
    
    if (lightboxSrc) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
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

  const handleDragOver = (e) => e.preventDefault();
  
  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setResultUrl(null);
      setError(null);
    }
  }

  const handlePredict = async () => {
    if (!selectedFile) return;

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('image', selectedFile);
    formData.append('threshold', threshold.toString());

    // Switch to Render URL when ready, or use Localhost
    let API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    
    // Remote trailing slash if present to avoid double slashes
    if (API_URL.endsWith('/')) {
      API_URL = API_URL.slice(0, -1);
    }

    console.log('Targeting API:', `${API_URL}/api/predict`);

    try {
      const response = await fetch(`${API_URL}/api/predict`, {
        method: 'POST',
        body: formData,
      });

      const contentType = response.headers.get("content-type");
      if (!response.ok) {
        // Try to get error message from JSON, otherwise use status text
        if (contentType && contentType.includes("application/json")) {
          const errorData = await response.json();
          const detailMsg = errorData.details || errorData.output || '';
          throw new Error(errorData.error + (detailMsg ? `: ${detailMsg.substring(0, 150)}...` : '') || `Server error: ${response.status}`);
        } else {
          const text = await response.text();
          console.error('Non-JSON Error Response:', text.substring(0, 200));
          throw new Error(`Server returned HTML/Text instead of JSON (Status: ${response.status}). Ensure the API URL is correct.`);
        }
      }

      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Server did not return a JSON response. Check your API URL.");
      }

      const data = await response.json();
      setResultUrl(data.resultUrl);
      setDetections(data.metadata?.detections || {});
    } catch (err) {
      console.error('Fetch error:', err);
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* 🚀 First Section: Hero/Overview */}
      <StaticHero />

      {/* Lightbox Component */}
      {lightboxSrc && (
        <div 
          className="lightbox active" 
          style={{ 
            opacity: 1, 
            pointerEvents: 'auto',
            display: 'flex', 
            position: 'fixed', 
            inset: 0, 
            zIndex: 10000, 
            background: 'rgba(255,255,255,0.85)', 
            backdropFilter: 'blur(15px)', 
            alignItems: 'center', 
            justifyContent: 'center' 
          }} 
          onClick={(e) => { if(e.target === e.currentTarget) setLightboxSrc(null); }}
        >
          <button 
            id="lightbox-close" 
            title="Close" 
            onClick={() => setLightboxSrc(null)}
            style={{
              position: 'absolute', top: '30px', right: '30px',
              background: 'var(--text)', color: 'var(--bg)', border: 'none', 
              borderRadius: '50%', width: '50px', height: '50px', 
              fontSize: '1.8rem', cursor: 'pointer', 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 10px 25px rgba(0,0,0,0.1)', zIndex: 10001
            }}
          >
            &times;
          </button>
          <img 
            src={lightboxSrc} 
            alt="Fullscreen view" 
            style={{ 
              transform: 'scale(1)', 
              maxWidth: '90vw', 
              maxHeight: '85vh', 
              borderRadius: 'var(--radius-lg)', 
              boxShadow: '0 40px 100px -20px rgba(0,0,0,0.2)' 
            }} 
          />
        </div>
      )}

      {/* Dynamic Upload Feature */}
      <section id="upload-feature" style={{ paddingTop: '80px', paddingBottom: '0' }}>
        <div className="reveal visible" style={{ maxWidth: '800px', margin: '0 auto', opacity: 1, transform: 'none' }}>
          <div className="section-label">Live Inference</div>
          <h2>Test the <em>Model</em></h2>
          <p className="section-desc">
            Upload an image to run the PyTorch RT-DETRv4-X model directly. The server will process the image and return bounding boxes. <br/>
            <strong>Click on any image to view it full screen.</strong>
          </p>

          <div 
            className="upload-section" 
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            {!previewUrl ? (
              <div>
                 <h3>Drag & Drop your image here</h3>
                 <p style={{ color: 'var(--muted)', margin: '10px 0 20px' }}>or click to browse</p>
                 <input 
                   type="file" 
                   accept="image/*" 
                   ref={fileInputRef} 
                   onChange={handleFileChange} 
                   className="upload-input" 
                 />
                 <button className="upload-btn" onClick={() => fileInputRef.current.click()}>Select Image</button>
              </div>
            ) : (
                <div>
                     <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <div style={{ flex: '1', minWidth: '300px' }}>
                           <h4 style={{fontFamily: 'var(--font-head)', marginBottom: '10px', color: 'var(--text)'}}>Input</h4>
                           <img src={previewUrl} alt="Preview" className="result-img" style={{ cursor: 'zoom-in' }} />
                        </div>
                        
                        {(resultUrl || loading) && (
                            <div style={{ flex: '1', minWidth: '300px' }}>
                               <h4 style={{fontFamily: 'var(--font-head)', marginBottom: '10px', color: 'var(--text)'}}>Output</h4>
                               {loading ? (
                                   <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '200px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)'}}>
                                        <div className="pipe-icon" style={{animation: 'pulse 1.5s infinite'}}>⚙️ Running Inference...</div>
                                   </div>
                               ) : (
                                   <img src={resultUrl} alt="Result" className="result-img label-after" style={{ cursor: 'zoom-in' }} />
                               )}
                            </div>
                        )}
                     </div>

                     {/* Analytics Display */}
                     {detections && !loading && (
                        <div style={{ marginTop: '2rem', display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center', animation: 'fadeUp 0.5s ease both' }}>
                            {Object.entries(detections).map(([name, count]) => {
                                const isViolation = name.includes('No');
                                return (
                                    <div key={name} style={{
                                        background: isViolation ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                                        border: `1px solid ${isViolation ? 'var(--red)' : 'var(--green)'}`,
                                        padding: '8px 16px',
                                        borderRadius: '999px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        fontSize: '0.85rem',
                                        fontWeight: '600',
                                        color: isViolation ? 'var(--red)' : 'var(--green)'
                                    }}>
                                        <span>{isViolation ? '⚠️' : '✅'}</span>
                                        <span style={{ fontFamily: 'var(--font-mono)' }}>{count}x {name}</span>
                                    </div>
                                );
                            })}
                            {Object.keys(detections).length === 0 && (
                                <div style={{ color: 'var(--muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>No PPE detected at this threshold.</div>
                            )}
                        </div>
                     )}

                     <div style={{ marginTop: '2.5rem', display: 'flex', gap: '15px', justifyContent: 'center' }}>
                         <button className="upload-btn" style={{ background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)'}} onClick={() => { setPreviewUrl(null); setResultUrl(null); setSelectedFile(null); setDetections(null); }}>Clear</button>
                         <button className="upload-btn" onClick={handlePredict} disabled={loading}>{loading ? 'Processing...' : 'Run Detection'}</button>
                     </div>

                     <div style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px' }}>
                        <span style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>Confidence Threshold: <strong style={{color: 'var(--amber)'}}>{threshold.toFixed(2)}</strong></span>
                        <input 
                            type="range" 
                            min="0.1" max="0.95" step="0.05" 
                            value={threshold} 
                            onChange={(e) => setThreshold(parseFloat(e.target.value))} 
                            style={{ width: '150px', accentColor: 'var(--amber)' }} 
                        />
                     </div>

                     {error && <p style={{ color: 'var(--red)', marginTop: '1rem' }}>{error}</p>}
                </div>
            )}
          </div>
        </div>
      </section>

      {/* Video Demonstration Feature */}
      <section id="video-demo" style={{ paddingTop: '5rem', paddingBottom: '3rem', paddingLeft: '2rem', paddingRight: '2rem' }}>
        <div className="reveal visible" style={{ maxWidth: '1200px', margin: '0 auto', opacity: 1, transform: 'none' }}>
            <div className="section-label">Video Inference</div>
            <h2>Input vs <em>Annotated Output Video</em></h2>
            <p className="section-desc">Real-time PPE detection across every frame. Original input video alongside the Output annotated video tracking at ≥ 0.45 confidence threshold.</p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginTop: '2rem' }}>
                <div className="video-wrapper" style={{background: '#ffffff', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: '0 40px 80px -20px rgba(0,0,0,0.15)'}}>
                  <div className="video-header" style={{padding: '1.2rem 1.6rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '10px'}}>
                    <div className="dot" style={{background:'#ef4444', width: '8px', height: '8px', borderRadius: '50%'}}></div>
                    <div className="dot" style={{background:'#f0b429', width: '8px', height: '8px', borderRadius: '50%'}}></div>
                    <div className="dot" style={{background:'#22c55e', width: '8px', height: '8px', borderRadius: '50%'}}></div>
                    <h3 style={{fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: '600', marginLeft: 'auto', marginRight: 'auto', color: 'var(--text)'}}>input_video.mp4</h3>
                  </div>
                  <video controls preload="metadata" loop style={{width: '100%', display: 'block', maxHeight: '520px', background: '#0a1520', borderBottomLeftRadius: 'var(--radius-lg)', borderBottomRightRadius: 'var(--radius-lg)'}}>
                    <source src="input_pics_videos/input_video.mp4" type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                </div>

                <div className="video-wrapper" style={{background: '#ffffff', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: '0 40px 80px -20px rgba(0,0,0,0.15)'}}>
                  <div className="video-header" style={{padding: '1.2rem 1.6rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '10px'}}>
                    <div className="dot" style={{background:'#ef4444', width: '8px', height: '8px', borderRadius: '50%'}}></div>
                    <div className="dot" style={{background:'#f0b429', width: '8px', height: '8px', borderRadius: '50%'}}></div>
                    <div className="dot" style={{background:'#22c55e', width: '8px', height: '8px', borderRadius: '50%'}}></div>
                    <h3 style={{color: 'var(--green)', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: '600', marginLeft: 'auto', marginRight: 'auto'}}>input_video_annotated_h264.mp4</h3>
                  </div>
                  <video controls preload="metadata" loop style={{width: '100%', display: 'block', maxHeight: '520px', background: '#0a1520', borderBottomLeftRadius: 'var(--radius-lg)', borderBottomRightRadius: 'var(--radius-lg)'}}>
                    <source src="output_pics_videos/input_video_annotated_h264.mp4" type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                </div>
            </div>
        </div>
      </section>

      {/* Static Original Content */}
      <StaticLanding />
    </div>
  );
}

export default App;
