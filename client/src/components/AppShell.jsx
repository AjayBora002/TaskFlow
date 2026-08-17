import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

export default function AppShell() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', position: 'relative' }}>
      <Navbar />
      <main style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
        {/* Decorative floating geometric shapes in background */}
        <div aria-hidden="true" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
          {/* Top-left corner glow accent */}
          <div style={{
            position: 'absolute', top: '80px', left: '-60px',
            width: '320px', height: '320px',
            background: 'radial-gradient(circle, rgba(16,185,129,0.06) 0%, transparent 70%)',
            borderRadius: '50%',
            filter: 'blur(40px)',
          }} />
          {/* Right side glow */}
          <div style={{
            position: 'absolute', top: '30%', right: '-80px',
            width: '400px', height: '280px',
            background: 'radial-gradient(ellipse, rgba(59,130,246,0.05) 0%, transparent 70%)',
            borderRadius: '50%',
            filter: 'blur(50px)',
          }} />
          {/* Bottom center glow */}
          <div style={{
            position: 'absolute', bottom: '0', left: '30%',
            width: '500px', height: '200px',
            background: 'radial-gradient(ellipse, rgba(139,92,246,0.04) 0%, transparent 70%)',
            borderRadius: '50%',
            filter: 'blur(60px)',
          }} />

          {/* Decorative floating rings — top right */}
          <svg
            style={{ position: 'absolute', top: '60px', right: '40px', opacity: 0.06 }}
            width="180" height="180" viewBox="0 0 180 180" fill="none"
          >
            <circle cx="90" cy="90" r="80" stroke="white" strokeWidth="1" strokeDasharray="4 8" />
            <circle cx="90" cy="90" r="55" stroke="white" strokeWidth="1" strokeDasharray="3 6" />
            <circle cx="90" cy="90" r="30" stroke="white" strokeWidth="1" strokeDasharray="2 4" />
          </svg>

          {/* Cross-grid — bottom left */}
          <svg
            style={{ position: 'absolute', bottom: '60px', left: '20px', opacity: 0.04 }}
            width="160" height="160" viewBox="0 0 160 160" fill="none"
          >
            {[0,1,2,3,4,5,6].map(i => (
              <line key={`h${i}`} x1="0" y1={i*24+8} x2="160" y2={i*24+8} stroke="white" strokeWidth="1" />
            ))}
            {[0,1,2,3,4,5,6].map(i => (
              <line key={`v${i}`} x1={i*24+8} y1="0" x2={i*24+8} y2="160" stroke="white" strokeWidth="1" />
            ))}
          </svg>

          {/* Diamond — center right */}
          <svg
            style={{ position: 'absolute', top: '45%', right: '12%', opacity: 0.05 }}
            width="60" height="60" viewBox="0 0 60 60" fill="none"
          >
            <polygon points="30,4 56,30 30,56 4,30" stroke="white" strokeWidth="1.5" fill="none" />
            <polygon points="30,14 46,30 30,46 14,30" stroke="white" strokeWidth="1" fill="none" />
          </svg>

          {/* Small dots cluster — top center */}
          <svg
            style={{ position: 'absolute', top: '80px', left: '42%', opacity: 0.07 }}
            width="120" height="40" viewBox="0 0 120 40" fill="none"
          >
            {[0,1,2,3,4,5].map(i =>
              [0,1].map(j => (
                <circle key={`d${i}${j}`} cx={i*22+10} cy={j*22+10} r="1.5" fill="white" />
              ))
            )}
          </svg>
        </div>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
