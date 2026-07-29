import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  FiGrid, FiAward, FiUsers, FiCalendar, FiLogOut, FiShield
} from 'react-icons/fi';
import { GiTrophy } from 'react-icons/gi';

const navItems = [
  { path: '/dashboard', icon: <FiGrid size={18} />, label: 'Dashboard' },
  { path: '/tournaments', icon: <FiAward size={18} />, label: 'Tournaments' },
  { path: '/teams', icon: <FiUsers size={18} />, label: 'Teams' },
  { path: '/matches', icon: <FiCalendar size={18} />, label: 'Matches' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

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
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-badge">
            <div className="avatar-circle">{user?.username?.[0]?.toUpperCase()}</div>
            <div className="user-info">
              <div className="user-name">{user?.username}</div>
              <div className="user-role">{user?.role}</div>
            </div>
            <button className="logout-btn" onClick={handleLogout} title="Logout">
              <FiLogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
