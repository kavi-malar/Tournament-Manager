import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FiPlus, FiSearch, FiCalendar, FiUsers, FiDollarSign, FiX, FiEdit2, FiTrash2, FiLogIn } from 'react-icons/fi';
import { GiTrophy } from 'react-icons/gi';
import { useAuth } from '../context/AuthContext';

const SPORTS = ['Football', 'Basketball', 'Cricket', 'Tennis', 'Volleyball', 'Badminton', 'Chess', 'Other'];
const FORMATS = ['single_elimination', 'double_elimination', 'round_robin', 'league'];
const STATUSES = ['upcoming', 'ongoing', 'completed', 'cancelled'];
const formatLabel = f => f.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
const EMPTY = { name: '', description: '', sport: 'Football', format: 'single_elimination', status: 'upcoming', max_teams: 8, prize_pool: '', start_date: '', end_date: '' };

export default function Tournaments() {
  const [tournaments, setTournaments] = useState([]);
  const [myTeams, setMyTeams] = useState([]);       // all teams the player belongs to
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [modalType, setModalType] = useState(null); // 'create'|'edit'|'register'|null
  const [createForm, setCreateForm] = useState({ ...EMPTY });
  const [editForm, setEditForm] = useState(null);
  const [registerForId, setRegisterForId] = useState(null);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [saving, setSaving] = useState(false);

  const { user } = useAuth();
  const navigate = useNavigate();
  const isOrgAdmin = user?.role === 'admin' || user?.role === 'organizer';
  const isPlayer = user?.role === 'player';

  const fetchAll = async () => {
    try {
      const tRes = await axios.get('/api/tournaments');
      setTournaments(tRes.data.tournaments);

      // For players fetch their teams via /api/teams/my
      if (user && user.role === 'player') {
        try {
          const myRes = await axios.get('/api/teams/my');
          setMyTeams(myRes.data.teams || []);
        } catch (_) {
          // fallback: get all teams and filter by membership
          const allRes = await axios.get('/api/teams');
          setMyTeams(allRes.data.teams.filter(t => t.captain_id === user.id));
        }
      }
    } catch { toast.error('Failed to load tournaments'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await axios.post('/api/tournaments', createForm);
      toast.success('Tournament created!');
      setModalType(null);
      setCreateForm({ ...EMPTY });
      fetchAll();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to create'); }
    finally { setSaving(false); }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await axios.put('/api/tournaments/' + editForm.id, editForm);
      toast.success('Tournament updated!');
      setModalType(null);
      setEditForm(null);
      fetchAll();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to update'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (t) => {
    if (!window.confirm('Delete "' + t.name + '"? All matches and registrations will be removed.')) return;
    try {
      await axios.delete('/api/tournaments/' + t.id);
      toast.success('Tournament deleted');
      fetchAll();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to delete'); }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    const teamId = selectedTeamId || (myTeams.length === 1 ? myTeams[0].id : '');
    if (!teamId) return toast.error('Please select a team to register');
    try {
      await axios.post('/api/tournaments/' + registerForId + '/register', { team_id: teamId });
      toast.success('Your team has been registered!');
      setModalType(null);
      setRegisterForId(null);
      setSelectedTeamId('');
      fetchAll();
    } catch (err) { toast.error(err.response?.data?.message || 'Registration failed'); }
  };

  const openCreate = () => { setCreateForm({ ...EMPTY }); setModalType('create'); };

  const openEdit = (t, e) => {
    e.stopPropagation();
    setEditForm({
      id: t.id,
      name: t.name,
      description: t.description || '',
      sport: t.sport,
      format: t.format,
      status: t.status,
      max_teams: t.max_teams,
      prize_pool: t.prize_pool || '',
      start_date: t.start_date ? t.start_date.slice(0, 10) : '',
      end_date: t.end_date ? t.end_date.slice(0, 10) : '',
    });
    setModalType('edit');
  };

  const openRegister = (tId, e) => {
    e.stopPropagation();
    setRegisterForId(tId);
    setSelectedTeamId(myTeams.length === 1 ? String(myTeams[0].id) : '');
    setModalType('register');
  };

  const closeModal = () => { setModalType(null); setEditForm(null); setRegisterForId(null); setSelectedTeamId(''); };

  const filtered = tournaments.filter(t => {
    const s = (t.name + ' ' + t.sport).toLowerCase();
    return s.includes(search.toLowerCase()) && (!filter || t.status === filter);
  });

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div>
      <div className="top-bar">
        <div className="page-title">TOURNAMENTS</div>
        {isOrgAdmin && (
          <button className="btn btn-primary" onClick={openCreate}><FiPlus size={16} /> New Tournament</button>
        )}
      </div>

      <div className="page-content">
        <div className="filter-bar">
          <div className="search-input-wrap">
            <FiSearch size={15} />
            <input className="form-input search-input" placeholder="Search tournaments..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          {['', 'upcoming', 'ongoing', 'completed', 'cancelled'].map(s => (
            <button key={s} className={`btn ${filter === s ? 'btn-primary' : 'btn-secondary'} btn-sm`}
              onClick={() => setFilter(s)}>
              {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        {isPlayer && myTeams.length === 0 && (
          <div style={{ padding: '12px 16px', background: 'rgba(240,180,41,0.1)', border: '1px solid rgba(240,180,41,0.3)', borderRadius: 8, fontSize: 13, color: 'var(--accent)', marginBottom: 16 }}>
            💡 You are not in any team yet. <span style={{ textDecoration: 'underline', cursor: 'pointer' }} onClick={() => navigate('/teams')}>Create or join a team</span> to register for tournaments.
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><GiTrophy /></div>
            <h3>No Tournaments Found</h3>
          </div>
        ) : (
          <div className="grid-2">
            {filtered.map(t => (
              <div key={t.id} className="tournament-card" style={{ position: 'relative' }}
                onClick={() => navigate('/tournaments/' + t.id)}>
                {isOrgAdmin && (
                  <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 6, zIndex: 2 }}
                    onClick={e => e.stopPropagation()}>
                    {/* BUG FIX: Show edit for admin or the organizer who owns this tournament */}
                    {(user?.role === 'admin' || t.organizer_id === user?.id) && (
                      <button className="btn btn-secondary btn-sm" title="Edit" onClick={e => openEdit(t, e)}><FiEdit2 size={12} /></button>
                    )}
                    {/* BUG FIX: Show delete for admin or the organizer who owns this tournament */}
                    {(user?.role === 'admin' || t.organizer_id === user?.id) && (
                      <button className="btn btn-danger btn-sm" title="Delete"
                        onClick={e => { e.stopPropagation(); handleDelete(t); }}><FiTrash2 size={12} /></button>
                    )}
                  </div>
                )}
                <div className="t-card-header">
                  <div style={{ paddingRight: isOrgAdmin ? 80 : 0 }}>
                    <div className="t-card-sport">{t.sport}</div>
                    <div className="t-card-name">{t.name}</div>
                  </div>
                  <span className={`badge badge-${t.status}`}>{t.status}</span>
                </div>
                <div className="t-card-body">
                  <div className="t-card-meta">
                    <div className="t-meta-item"><FiUsers size={13} />{t.registered_teams || 0}/{t.max_teams} Teams</div>
                    <div className="t-meta-item"><FiCalendar size={13} />{new Date(t.start_date).toLocaleDateString()}</div>
                    {t.prize_pool && <div className="t-meta-item"><FiDollarSign size={13} />{t.prize_pool}</div>}
                    <div className="t-meta-item" style={{ marginLeft: 'auto', color: 'var(--accent)', fontSize: 11, fontWeight: 600 }}>
                      {formatLabel(t.format)}
                    </div>
                  </div>
                  {t.description && (
                    <p style={{ marginTop: 10, fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                      {t.description.slice(0, 100)}{t.description.length > 100 ? '...' : ''}
                    </p>
                  )}
                  {isPlayer && myTeams.length > 0 && (t.status === 'upcoming' || t.status === 'ongoing') && (
                    <div style={{ marginTop: 12 }} onClick={e => e.stopPropagation()}>
                      <button className="btn btn-primary btn-sm" onClick={e => openRegister(t.id, e)}>
                        <FiLogIn size={13} /> Register My Team
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── CREATE MODAL ── */}
      {modalType === 'create' && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">NEW TOURNAMENT</div>
              <button className="modal-close" onClick={closeModal}><FiX size={20} /></button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Tournament Name</label>
                  <input className="form-input" placeholder="Summer Championship 2025"
                    value={createForm.name}
                    onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))} required />
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Sport</label>
                    <select className="form-select" value={createForm.sport}
                      onChange={e => setCreateForm(f => ({ ...f, sport: e.target.value }))}>
                      {SPORTS.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Format</label>
                    <select className="form-select" value={createForm.format}
                      onChange={e => setCreateForm(f => ({ ...f, format: e.target.value }))}>
                      {FORMATS.map(f => <option key={f} value={f}>{formatLabel(f)}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select className="form-select" value={createForm.status}
                      onChange={e => setCreateForm(f => ({ ...f, status: e.target.value }))}>
                      {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Max Teams</label>
                    <input className="form-input" type="number" min="2" max="128"
                      value={createForm.max_teams}
                      onChange={e => setCreateForm(f => ({ ...f, max_teams: e.target.value }))} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Prize Pool</label>
                    <input className="form-input" placeholder="$5000"
                      value={createForm.prize_pool}
                      onChange={e => setCreateForm(f => ({ ...f, prize_pool: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Start Date</label>
                    <input className="form-input" type="date"
                      value={createForm.start_date}
                      onChange={e => setCreateForm(f => ({ ...f, start_date: e.target.value }))} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">End Date</label>
                    <input className="form-input" type="date"
                      value={createForm.end_date}
                      onChange={e => setCreateForm(f => ({ ...f, end_date: e.target.value }))} required />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-textarea" placeholder="Tournament details..."
                    value={createForm.description}
                    onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Creating...' : 'Create Tournament'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── EDIT MODAL ── */}
      {modalType === 'edit' && editForm && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">EDIT TOURNAMENT</div>
              <button className="modal-close" onClick={closeModal}><FiX size={20} /></button>
            </div>
            <form onSubmit={handleEdit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Tournament Name</label>
                  <input className="form-input"
                    value={editForm.name}
                    onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} required />
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Sport</label>
                    <select className="form-select" value={editForm.sport}
                      onChange={e => setEditForm(f => ({ ...f, sport: e.target.value }))}>
                      {SPORTS.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Format</label>
                    <select className="form-select" value={editForm.format}
                      onChange={e => setEditForm(f => ({ ...f, format: e.target.value }))}>
                      {FORMATS.map(f => <option key={f} value={f}>{formatLabel(f)}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select className="form-select" value={editForm.status}
                      onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}>
                      {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Max Teams</label>
                    <input className="form-input" type="number" min="2" max="128"
                      value={editForm.max_teams}
                      onChange={e => setEditForm(f => ({ ...f, max_teams: e.target.value }))} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Prize Pool</label>
                    <input className="form-input"
                      value={editForm.prize_pool}
                      onChange={e => setEditForm(f => ({ ...f, prize_pool: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Start Date</label>
                    <input className="form-input" type="date"
                      value={editForm.start_date}
                      onChange={e => setEditForm(f => ({ ...f, start_date: e.target.value }))} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">End Date</label>
                    <input className="form-input" type="date"
                      value={editForm.end_date}
                      onChange={e => setEditForm(f => ({ ...f, end_date: e.target.value }))} required />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-textarea"
                    value={editForm.description}
                    onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── PLAYER REGISTER MODAL ── */}
      {modalType === 'register' && registerForId && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">REGISTER FOR TOURNAMENT</div>
              <button className="modal-close" onClick={closeModal}><FiX size={20} /></button>
            </div>
            <form onSubmit={handleRegister}>
              <div className="modal-body">
                {myTeams.length === 0 ? (
                  <p style={{ color: 'var(--red)', fontSize: 14 }}>
                    You are not in any team. Create or join a team first.
                  </p>
                ) : myTeams.length === 1 ? (
                  <div>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: 12, fontSize: 14 }}>
                      Register your team for this tournament?
                    </p>
                    <div style={{ padding: '12px 16px', background: 'rgba(77,159,255,0.1)', border: '1px solid rgba(77,159,255,0.2)', borderRadius: 8 }}>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Team</div>
                      <div style={{ fontWeight: 600, marginTop: 4 }}>{myTeams[0].name}</div>
                    </div>
                  </div>
                ) : (
                  <div className="form-group">
                    <label className="form-label">Select Your Team</label>
                    <select className="form-select" value={selectedTeamId}
                      onChange={e => setSelectedTeamId(e.target.value)} required>
                      <option value="">-- Choose a team --</option>
                      {myTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
                {myTeams.length > 0 && (
                  <button type="submit" className="btn btn-primary">Confirm Registration</button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
