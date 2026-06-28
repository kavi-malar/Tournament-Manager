import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FiSearch, FiPlus, FiEdit2, FiTrash2, FiX, FiCheck, FiActivity, FiXCircle } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';

const EMPTY_MATCH = { tournament_id: '', team1_id: '', team2_id: '', match_date: '', venue: '', round_number: 1, match_number: 1 };
const EMPTY_RESULT = { team1_score: 0, team2_score: 0, status: 'completed', notes: '' };

export default function Matches() {
  const { user } = useAuth();
  const [matches, setMatches] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [allTeams, setAllTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');

  // Modal state - kept completely separate to avoid re-render focus loss
  const [modalType, setModalType] = useState(null); // 'add' | 'edit' | 'result' | null
  const [addForm, setAddForm] = useState(EMPTY_MATCH);
  const [editForm, setEditForm] = useState(null);
  const [resultForm, setResultForm] = useState(EMPTY_RESULT);
  const [resultMatch, setResultMatch] = useState(null);
  const [saving, setSaving] = useState(false);

  const canManage = user?.role === 'admin' || user?.role === 'organizer';

  const fetchAll = useCallback(async () => {
    try {
      const [mRes, tRes, teRes] = await Promise.all([
        axios.get('/api/matches'),
        axios.get('/api/tournaments'),
        axios.get('/api/teams'),
      ]);
      setMatches(mRes.data.matches);
      setTournaments(tRes.data.tournaments);
      setAllTeams(teRes.data.teams);
    } catch { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await axios.post('/api/matches', addForm);
      toast.success('Match scheduled!');
      setModalType(null);
      setAddForm(EMPTY_MATCH);
      fetchAll();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleEditSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await axios.put('/api/matches/' + editForm.id, editForm);
      toast.success('Match updated!');
      setModalType(null);
      setEditForm(null);
      fetchAll();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleResultSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await axios.put('/api/matches/' + resultMatch.id + '/result', resultForm);
      toast.success('Score updated! Stats recalculated by DB trigger.');
      setModalType(null);
      setResultMatch(null);
      fetchAll();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleCancel = async (m) => {
    if (!window.confirm('Cancel match: ' + m.team1_name + ' vs ' + m.team2_name + '?')) return;
    try {
      await axios.put('/api/matches/' + m.id + '/cancel');
      toast.success('Match cancelled');
      fetchAll();
    } catch (err) { toast.error(err.response?.data?.message || 'Cannot cancel this match'); }
  };

  const handleDelete = async (m) => {
    if (!window.confirm('Permanently delete match: ' + m.team1_name + ' vs ' + m.team2_name + '?')) return;
    try {
      await axios.delete('/api/matches/' + m.id);
      toast.success('Match deleted');
      fetchAll();
    } catch { toast.error('Failed to delete'); }
  };

  const openResult = (m) => {
    setResultMatch(m);
    setResultForm({ team1_score: m.team1_score || 0, team2_score: m.team2_score || 0, status: 'completed', notes: m.notes || '' });
    setModalType('result');
  };

  const openEdit = (m) => {
    setEditForm({ ...m, match_date: m.match_date ? m.match_date.slice(0, 16) : '' });
    setModalType('edit');
  };

  const filtered = matches.filter(m => {
    const s = [m.team1_name, m.team2_name, m.tournament_name, m.venue || ''].join(' ').toLowerCase();
    return s.includes(search.toLowerCase()) && (!filter || m.status === filter);
  });

  const grouped = filtered.reduce((acc, m) => {
    if (!acc[m.tournament_name]) acc[m.tournament_name] = [];
    acc[m.tournament_name].push(m);
    return acc;
  }, {});

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div>
      <div className="top-bar">
        <div className="page-title">MATCHES</div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{filtered.length} matches</span>
          {canManage && (
            <button className="btn btn-primary" onClick={() => { setAddForm(EMPTY_MATCH); setModalType('add'); }}>
              <FiPlus size={16} /> Schedule Match
            </button>
          )}
        </div>
      </div>

      <div className="page-content">
        <div className="filter-bar">
          <div className="search-input-wrap">
            <FiSearch size={15} />
            <input className="form-input search-input" placeholder="Search matches..." value={search}
              onChange={e => setSearch(e.target.value)} />
          </div>
          {['', 'scheduled', 'ongoing', 'completed', 'cancelled'].map(s => (
            <button key={s} className={`btn ${filter === s ? 'btn-primary' : 'btn-secondary'} btn-sm`}
              onClick={() => setFilter(s)}>
              {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        {Object.keys(grouped).length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">⚽</div>
            <h3>No Matches Found</h3>
            {canManage && (
              <button className="btn btn-primary" style={{ marginTop: 12 }}
                onClick={() => { setAddForm(EMPTY_MATCH); setModalType('add'); }}>
                <FiPlus size={15} /> Schedule First Match
              </button>
            )}
          </div>
        ) : (
          Object.entries(grouped).map(([tName, tMatches]) => (
            <div key={tName} style={{ marginBottom: 32 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, letterSpacing: 1.5, color: 'var(--accent)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 3, height: 16, background: 'var(--accent)', borderRadius: 2, display: 'inline-block' }} />
                {tName.toUpperCase()}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {tMatches.map(m => (
                  <div key={m.id} className="match-card">
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 80 }}>
                      Round {m.round_number}<br />
                      {new Date(m.match_date).toLocaleDateString()}<br />
                      {new Date(m.match_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="match-teams">
                      <div className="team-block">
                        <div className="team-n" style={{ color: m.winner_id === m.team1_id ? 'var(--accent)' : 'inherit' }}>{m.team1_name}</div>
                      </div>
                      <div className="vs-block">
                        {m.status === 'completed'
                          ? <div className="vs-score">{m.team1_score} – {m.team2_score}</div>
                          : <div className="vs-text">VS</div>}
                        <span className={`badge badge-${m.status}`} style={{ marginTop: 4 }}>{m.status}</span>
                      </div>
                      <div className="team-block right">
                        <div className="team-n" style={{ color: m.winner_id === m.team2_id ? 'var(--accent)' : 'inherit' }}>{m.team2_name}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'right', minWidth: 100 }}>
                      {m.venue && <div>📍 {m.venue}</div>}
                      {m.winner_name && <div style={{ color: 'var(--green)', marginTop: 4 }}>🏆 {m.winner_name}</div>}
                    </div>
                    {canManage && (
                      <div style={{ display: 'flex', gap: 6, marginLeft: 8, flexShrink: 0 }}>
                        <button className="btn btn-secondary btn-sm" title="Update Score" onClick={() => openResult(m)}><FiActivity size={13} /></button>
                        <button className="btn btn-secondary btn-sm" title="Edit" onClick={() => openEdit(m)}><FiEdit2 size={13} /></button>
                        {['scheduled', 'ongoing'].includes(m.status) && (
                          <button className="btn btn-danger btn-sm" title="Cancel Match" onClick={() => handleCancel(m)}><FiXCircle size={13} /></button>
                        )}
                        <button className="btn btn-danger btn-sm" title="Delete" onClick={() => handleDelete(m)}><FiTrash2 size={13} /></button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── ADD MATCH MODAL ── */}
      {modalType === 'add' && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModalType(null)}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">SCHEDULE MATCH</div>
              <button className="modal-close" onClick={() => setModalType(null)}><FiX size={20} /></button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Tournament</label>
                  <select className="form-select" value={addForm.tournament_id}
                    onChange={e => setAddForm(f => ({ ...f, tournament_id: e.target.value, team1_id: '', team2_id: '' }))} required>
                    <option value="">-- Select Tournament --</option>
                    {tournaments.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Team 1</label>
                    <select className="form-select" value={addForm.team1_id}
                      onChange={e => setAddForm(f => ({ ...f, team1_id: e.target.value }))} required>
                      <option value="">Select</option>
                      {allTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Team 2</label>
                    <select className="form-select" value={addForm.team2_id}
                      onChange={e => setAddForm(f => ({ ...f, team2_id: e.target.value }))} required>
                      <option value="">Select</option>
                      {allTeams.filter(t => String(t.id) !== String(addForm.team1_id)).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Date & Time</label>
                    <input className="form-input" type="datetime-local" value={addForm.match_date}
                      onChange={e => setAddForm(f => ({ ...f, match_date: e.target.value }))} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Round</label>
                    <input className="form-input" type="number" min="1" value={addForm.round_number}
                      onChange={e => setAddForm(f => ({ ...f, round_number: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Match #</label>
                    <input className="form-input" type="number" min="1" value={addForm.match_number}
                      onChange={e => setAddForm(f => ({ ...f, match_number: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Venue</label>
                    <input className="form-input" placeholder="Stadium..." value={addForm.venue}
                      onChange={e => setAddForm(f => ({ ...f, venue: e.target.value }))} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModalType(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Schedule'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── EDIT MATCH MODAL ── */}
      {modalType === 'edit' && editForm && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModalType(null)}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">EDIT MATCH</div>
              <button className="modal-close" onClick={() => setModalType(null)}><FiX size={20} /></button>
            </div>
            <form onSubmit={handleEditSave}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Team 1</label>
                    <select className="form-select" value={editForm.team1_id}
                      onChange={e => setEditForm(f => ({ ...f, team1_id: e.target.value }))}>
                      {allTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Team 2</label>
                    <select className="form-select" value={editForm.team2_id}
                      onChange={e => setEditForm(f => ({ ...f, team2_id: e.target.value }))}>
                      {allTeams.filter(t => String(t.id) !== String(editForm.team1_id)).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Date & Time</label>
                    <input className="form-input" type="datetime-local" value={editForm.match_date || ''}
                      onChange={e => setEditForm(f => ({ ...f, match_date: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Round</label>
                    <input className="form-input" type="number" min="1" value={editForm.round_number}
                      onChange={e => setEditForm(f => ({ ...f, round_number: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Match #</label>
                    <input className="form-input" type="number" min="1" value={editForm.match_number}
                      onChange={e => setEditForm(f => ({ ...f, match_number: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Venue</label>
                    <input className="form-input" value={editForm.venue || ''}
                      onChange={e => setEditForm(f => ({ ...f, venue: e.target.value }))} />
                  </div>
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

      {/* ── SCORE / RESULT MODAL ── */}
      {modalType === 'result' && resultMatch && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModalType(null)}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">UPDATE SCORE</div>
              <button className="modal-close" onClick={() => setModalType(null)}><FiX size={20} /></button>
            </div>
            <form onSubmit={handleResultSave}>
              <div className="modal-body">
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16, padding: 16, background: 'var(--bg-secondary)', borderRadius: 10 }}>
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>{resultMatch.team1_name}</div>
                    <input className="form-input" type="number" min="0"
                      style={{ textAlign: 'center', fontSize: 28, fontFamily: 'var(--font-display)', padding: '8px' }}
                      value={resultForm.team1_score}
                      onChange={e => setResultForm(f => ({ ...f, team1_score: parseInt(e.target.value) || 0 }))} />
                  </div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--text-muted)' }}>–</div>
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>{resultMatch.team2_name}</div>
                    <input className="form-input" type="number" min="0"
                      style={{ textAlign: 'center', fontSize: 28, fontFamily: 'var(--font-display)', padding: '8px' }}
                      value={resultForm.team2_score}
                      onChange={e => setResultForm(f => ({ ...f, team2_score: parseInt(e.target.value) || 0 }))} />
                  </div>
                </div>
                {resultForm.team1_score !== resultForm.team2_score ? (
                  <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--green)', marginBottom: 12 }}>
                    <FiCheck size={13} style={{ marginRight: 4 }} />
                    Winner: <strong>{resultForm.team1_score > resultForm.team2_score ? resultMatch.team1_name : resultMatch.team2_name}</strong>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--accent)', marginBottom: 12 }}>Draw</div>
                )}
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-select" value={resultForm.status}
                    onChange={e => setResultForm(f => ({ ...f, status: e.target.value }))}>
                    <option value="ongoing">Ongoing</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <textarea className="form-textarea" placeholder="Extra time, penalties..." value={resultForm.notes}
                    onChange={e => setResultForm(f => ({ ...f, notes: e.target.value }))} />
                </div>
                <div style={{ padding: '10px 12px', background: 'rgba(240,180,41,0.08)', border: '1px solid rgba(240,180,41,0.2)', borderRadius: 8, fontSize: 12, color: 'var(--text-muted)' }}>
                  ⚡ Team stats auto-updated by MySQL trigger on save.
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModalType(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Score'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
