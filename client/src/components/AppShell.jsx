import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

export default function AppShell() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <Navbar />
      <main style={{ flex: 1, overflow: 'auto', position: 'relative', zIndex: 1 }}>
        <Outlet />
      </main>
    </div>
  );
}
