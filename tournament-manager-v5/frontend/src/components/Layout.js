import React, { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import {
  FiGrid, FiAward, FiUsers, FiCalendar, FiLogOut, FiBell,
  FiSun, FiMoon, FiBarChart2, FiShield, FiUser, FiX, FiCheck
} from 'react-icons/fi';
import { GiTrophy } from 'react-icons/gi';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode') !== 'false');
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [showNotifs, setShowNotifs] = useState(false);
  const notifRef = useRef(null);

  const navItems = [
    { path: '/dashboard', icon: <FiGrid size={18} />, label: 'Dashboard' },
    { path: '/tournaments', icon: <FiAward size={18} />, label: 'Tournaments' },
    { path: '/teams', icon: <FiUsers size={18} />, label: 'Teams' },
    { path: '/matches', icon: <FiCalendar size={18} />, label: 'Matches' },
    { path: '/leaderboard', icon: <FiBarChart2 size={18} />, label: 'Leaderboard' },
    ...(user?.role === 'admin' ? [
      { path: '/admin/users', icon: <FiShield size={18} />, label: 'User Management' },
      { path: '/admin/audit', icon: <FiShield size={18} />, label: 'Audit Log' },
    ] : []),
  ];

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const res = await axios.get('/api/notifications');
      setNotifications(res.data.notifications || []);
      setUnread(res.data.unread_count || 0);
    } catch (_) {}
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifs(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleMarkRead = async (id) => {
    try { await axios.put('/api/notifications/' + id + '/read'); fetchNotifications(); } catch (_) {}
  };
  const handleMarkAllRead = async () => {
    try { await axios.put('/api/notifications/read-all'); fetchNotifications(); } catch (_) {}
  };
  const handleDeleteNotif = async (id, e) => {
    e.stopPropagation();
    try { await axios.delete('/api/notifications/' + id); fetchNotifications(); } catch (_) {}
  };
  const handleLogout = () => { logout(); navigate('/login'); };
  const notifTypeIcon = (type) => ({ match_scheduled:'📅', match_result:'🏆', tournament_start:'🎯', announcement:'📢', achievement:'🥇', registration:'✅' }[type] || '🔔');

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <GiTrophy size={28} color="var(--accent)" />
            <div>
              <div className="logo-text">ARENA</div>
              <div className="logo-sub">Tournament Manager</div>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">Navigation</div>
          {navItems.map(item => (
            <NavLink key={item.path} to={item.path} className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
              {item.icon}{item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div style={{ display: 'flex', gap: 8, marginBottom: 10, justifyContent: 'center' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setDarkMode(d => !d)} title={darkMode ? 'Light Mode' : 'Dark Mode'} style={{ padding: '6px 10px' }}>
              {darkMode ? <FiSun size={15} /> : <FiMoon size={15} />}
            </button>
            {/* <button className="btn btn-secondary btn-sm" onClick={() => navigate('/profile/' + user?.id)} title="My Profile" style={{ padding: '6px 10px' }}>
              <FiUser size={15} />
            </button> */}
            <div style={{ position: 'relative' }} ref={notifRef}>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowNotifs(s => !s)} title="Notifications" style={{ padding: '6px 10px', position: 'relative' }}>
                <FiBell size={15} />
                {unread > 0 && (
                  <span style={{ position: 'absolute', top: -4, right: -4, background: '#ef4444', color: '#fff', borderRadius: '50%', fontSize: 9, width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{unread > 9 ? '9+' : unread}</span>
                )}
              </button>
              {showNotifs && (
                <div style={{ position: 'absolute', bottom: '110%', left: '50%', transform: 'translateX(-50%)', width: 320, background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.3)', zIndex: 1000, maxHeight: 400, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontWeight: 700, fontSize: 13 }}>Notifications</span>
                    {unread > 0 && <button onClick={handleMarkAllRead} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}><FiCheck size={12} /> Mark all read</button>}
                  </div>
                  <div style={{ overflowY: 'auto', maxHeight: 340 }}>
                    {notifications.length === 0
                      ? <div style={{ padding: '24px 14px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No notifications yet</div>
                      : notifications.map(n => (
                        <div key={n.id} onClick={() => !n.is_read && handleMarkRead(n.id)} style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', cursor: 'pointer', display: 'flex', gap: 10, alignItems: 'flex-start', background: n.is_read ? 'transparent' : 'rgba(240,180,41,0.06)' }}>
                          <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>{notifTypeIcon(n.type)}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: n.is_read ? 400 : 700, fontSize: 12, marginBottom: 2 }}>{n.title}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4 }}>{n.message}</div>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>{new Date(n.created_at).toLocaleString()}</div>
                          </div>
                          <button onClick={(e) => handleDeleteNotif(n.id, e)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 2, flexShrink: 0 }}><FiX size={12} /></button>
                        </div>
                      ))
                    }
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="user-badge">
            <div className="avatar-circle">{user?.username?.[0]?.toUpperCase()}</div>
            <div className="user-info">
              <div className="user-name">{user?.username}</div>
              <div className="user-role">{user?.role}</div>
            </div>
            <button className="logout-btn" onClick={handleLogout} title="Logout"><FiLogOut size={16} /></button>
          </div>
        </div>
      </aside>
      <main className="main-content"><Outlet /></main>
    </div>
  );
}
