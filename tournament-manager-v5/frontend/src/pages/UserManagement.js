import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FiUsers, FiTrash2, FiEdit2, FiCheck, FiX } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';

const ROLES = ['player', 'organizer', 'admin'];
const ROLE_COLORS = { admin: '#ef4444', organizer: '#f59e0b', player: '#22c55e' };

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingRole, setEditingRole] = useState(null); // userId
  const [newRole, setNewRole] = useState('');
  const navigate = useNavigate();

  const fetchUsers = () => {
    axios.get('/api/users')
      .then(r => setUsers(r.data.users || []))
      .catch(() => toast.error('Failed to load users'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleRoleChange = async (userId) => {
    try {
      await axios.put('/api/users/' + userId + '/role', { role: newRole });
      toast.success('Role updated!');
      setEditingRole(null);
      fetchUsers();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to update'); }
  };

  const handleDelete = async (u) => {
    if (!window.confirm('Delete user "' + u.username + '"? This cannot be undone.')) return;
    try {
      await axios.delete('/api/users/' + u.id);
      toast.success('User deleted');
      fetchUsers();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to delete'); }
  };

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  const counts = { admin: 0, organizer: 0, player: 0 };
  users.forEach(u => { if (counts[u.role] !== undefined) counts[u.role]++; });

  return (
    <div>
      <div className="top-bar">
        <div className="page-title">USER MANAGEMENT</div>
      </div>
      <div className="page-content">

        {/* Stats */}
        <div className="grid-3" style={{ marginBottom: 20 }}>
          {[
            { label: 'Total Users', value: users.length, color: 'var(--accent)' },
            { label: 'Admins', value: counts.admin, color: '#ef4444' },
            { label: 'Organizers', value: counts.organizer, color: '#f59e0b' },
            { label: 'Players', value: counts.player, color: '#22c55e' },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['User', 'Email', 'Role', 'Teams', 'Joined', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 34, height: 34, borderRadius: 8, background: ROLE_COLORS[u.role] + '33', border: '2px solid ' + ROLE_COLORS[u.role], display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, color: ROLE_COLORS[u.role], flexShrink: 0 }}>
                          {u.username[0].toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{u.username}</div>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>ID: {u.id}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 13, color: 'var(--text-muted)' }}>{u.email}</td>
                    <td style={{ padding: '12px 14px' }}>
                      {editingRole === u.id ? (
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <select value={newRole} onChange={e => setNewRole(e.target.value)}
                            style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontSize: 12 }}>
                            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                          <button className="btn btn-primary btn-sm" onClick={() => handleRoleChange(u.id)} style={{ padding: '4px 8px' }}><FiCheck size={12} /></button>
                          <button className="btn btn-secondary btn-sm" onClick={() => setEditingRole(null)} style={{ padding: '4px 8px' }}><FiX size={12} /></button>
                        </div>
                      ) : (
                        <span style={{ background: ROLE_COLORS[u.role] + '22', color: ROLE_COLORS[u.role], padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>{u.role}</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>{u.team_count}</td>
                    <td style={{ padding: '12px 14px', fontSize: 13, color: 'var(--text-muted)' }}>{new Date(u.created_at).toLocaleDateString()}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-secondary btn-sm" title="View Profile" onClick={() => navigate('/profile/' + u.id)}>
                          <FiUsers size={12} />
                        </button>
                        <button className="btn btn-secondary btn-sm" title="Edit Role"
                          onClick={() => { setEditingRole(u.id); setNewRole(u.role); }}>
                          <FiEdit2 size={12} />
                        </button>
                        <button className="btn btn-danger btn-sm" title="Delete User" onClick={() => handleDelete(u)}>
                          <FiTrash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
