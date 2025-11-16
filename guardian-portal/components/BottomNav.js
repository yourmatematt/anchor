/**
 * Bottom Navigation Component
 * Mobile-first navigation
 */

import Link from 'next/link';
import { useRouter } from 'next/router';

export default function BottomNav() {
  const router = useRouter();

  const isActive = (path) => router.pathname === path;

  return (
    <nav className="bottom-nav">
      <Link href="/dashboard" className={`nav-item ${isActive('/dashboard') ? 'nav-item-active' : ''}`}>
        <div className="nav-icon">📊</div>
        <div>Dashboard</div>
      </Link>

      <Link href="/conversations" className={`nav-item ${isActive('/conversations') ? 'nav-item-active' : ''}`}>
        <div className="nav-icon">💬</div>
        <div>Conversations</div>
      </Link>

      <Link href="/patterns" className={`nav-item ${isActive('/patterns') ? 'nav-item-active' : ''}`}>
        <div className="nav-icon">📈</div>
        <div>Patterns</div>
      </Link>
    </nav>
  );
}
