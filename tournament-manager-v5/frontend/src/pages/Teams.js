import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FiPlus, FiSearch, FiX, FiEdit2, FiTrash2 } from 'react-icons/fi';
import { FaTrophy } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';

export default function Teams() {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalType, setModalType] = useState(null); // 'create' | 'edit' | null
  const [teamName, setTeamName] = useState('');
  const [editingTeam, setEditingTeam] = useState(null);
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const fetchTeams = async () => {
    try {
      const { data } = await axios.get('/api/teams');
      setTeams(data.teams);
    } catch { toast.error('Failed to load teams'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchTeams(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await axios.post('/api/teams', { name: teamName });
      toast.success('Team created!');
      setModalType(null);
      setTeamName('');
      fetchTeams();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await axios.put('/api/teams/' + editingTeam.id, { name: editingTeam.name });
      toast.success('Team updated!');
      setModalType(null);
      setEditingTeam(null);
      fetchTeams();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (t) => {
    if (!window.confirm('Delete team "' + t.name + '"? This cannot be undone.')) return;
    try {
      await axios.delete('/api/teams/' + t.id);
      toast.success('Team deleted');
      fetchTeams();
    } catch { toast.error('Failed to delete team'); }
  };

  const openEdit = (t, e) => {
    e.stopPropagation();
    setEditingTeam({ id: t.id, name: t.name });
    setModalType('edit');
  };

  const canEdit = (t) => user?.role === 'admin' || user?.id === t.captain_id;
  const filtered = teams.filter(t => t.name.toLowerCase().includes(search.toLowerCase()));
  const COLORS = ['#f0b429', '#4d9fff', '#2ecc71', '#a855f7', '#ff4d4d', '#f97316', '#06b6d4', '#ec4899'];

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div>
      <div className="top-bar">
        <div className="page-title">TEAMS</div>
        <button className="btn btn-primary" onClick={() => { setTeamName(''); setModalType('create'); }}>
          <FiPlus size={16} />Create Team
        </button>
      </div>

      <div className="page-content">
        <div className="filter-bar">
          <div className="search-input-wrap">
            <FiSearch size={15} />
            <input className="form-input search-input" placeholder="Search teams..." value={search}
              onChange={e => setSearch(e.target.value)} />
          </div>
          <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{filtered.length} teams</span>
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><FaTrophy /></div>
            <h3>No Teams Found</h3>
          </div>
        ) : (
          <div className="grid-3">
            {filtered.map((t, i) => {
              const color = COLORS[i % COLORS.length];
              const initial = t.name[0].toUpperCase();
              const winRate = t.wins + t.losses + t.draws > 0
                ? Math.round((t.wins / (t.wins + t.losses + t.draws)) * 100) : 0;
              return (
                <div key={t.id} className="card" style={{ cursor: 'pointer', borderTop: '3px solid ' + color, position: 'relative' }}
                  onClick={() => navigate('/teams/' + t.id)}>
                  {canEdit(t) && (
                    <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', gap: 6 }}
                      onClick={e => e.stopPropagation()}>
                      <button className="btn btn-secondary btn-sm" onClick={e => openEdit(t, e)}>
                        <FiEdit2 size={12} />
                      </button>
                      {canEdit(t) && (
                        <button className="btn btn-danger btn-sm" onClick={e => { e.stopPropagation(); handleDelete(t); }}>
                          <FiTrash2 size={12} />
                        </button>
                      )}
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14, paddingRight: canEdit(t) ? 64 : 0 }}>
                    <div style={{ width: 48, height: 48, borderRadius: 12, background: color + '22', border: '2px solid ' + color + '44', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: 24, color, flexShrink: 0 }}>
                      {initial}
                    </div>
                    <div>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, letterSpacing: 0.5 }}>{t.name}</div>
                      {t.captain_name && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Captain: {t.captain_name}</div>}
                      {t.member_count > 0 && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t.member_count} member{t.member_count !== 1 ? 's' : ''}</div>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                    {[
                      { label: 'W', val: t.wins, color: 'var(--green)', bg: 'rgba(46,204,113,0.1)' },
                      { label: 'L', val: t.losses, color: 'var(--red)', bg: 'rgba(255,77,77,0.1)' },
                      { label: 'D', val: t.draws, color: 'var(--accent)', bg: 'rgba(240,180,41,0.1)' },
                      { label: 'Pts', val: t.points, color, bg: color + '18' },
                    ].map(s => (
                      <div key={s.label} style={{ flex: 1, textAlign: 'center', padding: '8px 4px', background: s.bg, borderRadius: 6 }}>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: s.color }}>{s.val}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, height: 4, background: 'var(--bg-hover)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ width: winRate + '%', height: '100%', background: color, borderRadius: 2, transition: 'width 0.5s' }} />
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 36 }}>{winRate}% W</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {modalType === 'create' && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModalType(null)}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">CREATE TEAM</div>
              <button className="modal-close" onClick={() => setModalType(null)}><FiX size={20} /></button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Team Name</label>
                  <input className="form-input" placeholder="Thunder Wolves" value={teamName}
                    onChange={e => setTeamName(e.target.value)} required />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModalType(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Creating...' : 'Create Team'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {modalType === 'edit' && editingTeam && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModalType(null)}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">EDIT TEAM</div>
              <button className="modal-close" onClick={() => setModalType(null)}><FiX size={20} /></button>
            </div>
            <form onSubmit={handleEdit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Team Name</label>
                  <input className="form-input" value={editingTeam.name}
                    onChange={e => setEditingTeam(t => ({ ...t, name: e.target.value }))} required />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModalType(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
