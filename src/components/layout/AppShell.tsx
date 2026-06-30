import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import { signOut } from '../../lib/auth';

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: GridIcon },
  { path: '/goals', label: 'Goals', icon: TargetIcon },
  { path: '/checkin', label: 'Daily Review', icon: CheckIcon },
  { path: '/analytics', label: 'Insights', icon: ChartIcon },
  { path: '/settings', label: 'Settings', icon: SettingsIcon },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = React.useState(true);

  async function handleSignOut() {
    await signOut();
    window.location.href = '/';
  }

  return (
    <div className="shell-root">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'collapsed'}`}>
        {/* Brand */}
        <div className="sidebar-brand">
          <div className="sidebar-logo-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="url(#sg)" strokeWidth="1.5" strokeLinejoin="round"/>
              <path d="M2 17l10 5 10-5" stroke="url(#sg)" strokeWidth="1.5" strokeLinejoin="round"/>
              <path d="M2 12l10 5 10-5" stroke="url(#sg)" strokeWidth="1.5" strokeLinejoin="round"/>
              <defs>
                <linearGradient id="sg" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#4f8ef7"/>
                  <stop offset="1" stopColor="#7c3aed"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          {sidebarOpen && <span className="sidebar-brand-name">Aegis AI</span>}
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(p => !p)}
            title={sidebarOpen ? 'Collapse' : 'Expand'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {sidebarOpen
                ? <path d="M15 18l-6-6 6-6"/>
                : <path d="M9 18l6-6-6-6"/>}
            </svg>
          </button>
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const active = location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path} className={`sidebar-link ${active ? 'active' : ''}`}>
                {active && (
                  <motion.div
                    className="sidebar-active-bg"
                    layoutId="sidebar-active"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <Icon size={18} />
                {sidebarOpen && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Bottom user area */}
        <div className="sidebar-bottom">
          {sidebarOpen && (
            <div className="sidebar-user">
              <div className="user-avatar">
                {profile?.avatar_url
                  ? <img src={profile.avatar_url} alt="avatar" />
                  : <span>{profile?.display_name?.[0] ?? '?'}</span>}
              </div>
              <div className="user-info">
                <div className="user-name">{profile?.display_name ?? 'User'}</div>
                <div className="user-email">{profile?.email ?? ''}</div>
              </div>
            </div>
          )}
          <button className="signout-btn" onClick={handleSignOut} title="Sign out">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
            </svg>
            {sidebarOpen && <span>Sign out</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="shell-main">
        {children}
      </main>

      <style>{SHELL_STYLES}</style>
    </div>
  );
}

// ── Icon Components ──

function GridIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  );
}

function TargetIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
    </svg>
  );
}

function CheckIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
    </svg>
  );
}

function ChartIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
    </svg>
  );
}

function SettingsIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  );
}

const SHELL_STYLES = `
.shell-root {
  display: flex;
  min-height: 100vh;
}

/* ─ SIDEBAR ─ */
.sidebar {
  display: flex;
  flex-direction: column;
  height: 100vh;
  position: sticky;
  top: 0;
  background: var(--bg-surface);
  border-right: 1px solid var(--border-subtle);
  transition: width 0.25s cubic-bezier(0.4,0,0.2,1);
  z-index: 50;
  overflow: hidden;
}
.sidebar.open { width: 220px; }
.sidebar.collapsed { width: 64px; }

.sidebar-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px;
  border-bottom: 1px solid var(--border-subtle);
  height: 60px;
  flex-shrink: 0;
}
.sidebar-logo-icon {
  width: 32px; height: 32px;
  border-radius: 8px;
  background: rgba(79,142,247,0.1);
  border: 1px solid rgba(79,142,247,0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.sidebar-brand-name {
  font-size: 15px;
  font-weight: 700;
  letter-spacing: -0.3px;
  white-space: nowrap;
  flex: 1;
}
.sidebar-toggle {
  background: transparent;
  border: 1px solid var(--border-subtle);
  border-radius: 6px;
  color: var(--text-muted);
  cursor: pointer;
  width: 26px; height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s, border-color 0.2s;
  flex-shrink: 0;
}
.sidebar-toggle:hover { color: var(--text-primary); border-color: var(--border-strong); }

.sidebar-nav {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 12px 8px;
  overflow-y: auto;
}
.sidebar-link {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  position: relative;
  transition: color 0.2s;
  white-space: nowrap;
}
.sidebar-link:hover { color: var(--text-primary); }
.sidebar-link.active { color: var(--text-primary); }
.sidebar-active-bg {
  position: absolute;
  inset: 0;
  background: rgba(79,142,247,0.10);
  border: 1px solid rgba(79,142,247,0.15);
  border-radius: var(--radius-md);
}
.sidebar-link > svg,
.sidebar-link > span { position: relative; z-index: 1; }

.sidebar-bottom {
  padding: 12px 8px;
  border-top: 1px solid var(--border-subtle);
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.sidebar-user {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
}
.user-avatar {
  width: 32px; height: 32px;
  border-radius: 50%;
  background: var(--accent-blue); color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  flex-shrink: 0;
  overflow: hidden;
}
.user-avatar img { width: 100%; height: 100%; object-fit: cover; }
.user-info { flex: 1; min-width: 0; }
.user-name { font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.user-email { font-size: 11px; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.signout-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 10px;
  background: transparent;
  border: none;
  border-radius: var(--radius-md);
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: color 0.2s, background 0.2s;
  font-family: 'Inter', sans-serif;
}
.signout-btn:hover { color: #ef4444; background: rgba(239,68,68,0.08); }

/* ─ MAIN ─ */
.shell-main {
  flex: 1;
  min-width: 0;
  overflow-y: auto;
  background: var(--bg-base);
}
`;
