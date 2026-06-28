import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FiUser, FiCalendar, FiTrash2, FiEdit2, FiPlus, FiX, FiClock, FiActivity, FiCheckCircle, FiXCircle, FiMinus } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';

export default function TeamDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [team, setTeam] = useState(null);
  const [members, setMembers] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('roster');
  const [modalType, setModalType] = useState(null); // 'edit' | 'addMember' | null
  const [editName, setEditName] = useState('');
  const [newUserId, setNewUserId] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchTeam = async () => {
    try {
      const [teamRes, matchRes] = await Promise.all([
        axios.get('/api/teams/' + id),
        axios.get('/api/matches?team_id=' + id),
      ]);
      setTeam(teamRes.data.team);
      setMembers(teamRes.data.members);
      setMatches(matchRes.data.matches);
    } catch { toast.error('Failed to load team'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchTeam(); }, [id]);

  const removeMember = async (userId) => {
    if (!window.confirm('Remove this member?')) return;
    try {
      await axios.delete('/api/teams/' + id + '/members/' + userId);
      toast.success('Member removed');
      fetchTeam();
    } catch { toast.error('Failed to remove'); }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await axios.put('/api/teams/' + id, { name: editName });
      toast.success('Team updated!');
      setModalType(null);
      fetchTeam();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await axios.post('/api/teams/' + id + '/members', { user_id: newUserId });
      toast.success('Member added!');
      setModalType(null);
      setNewUserId('');
      fetchTeam();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to add member'); }
    finally { setSaving(false); }
  };

  const handleDeleteTeam = async () => {
    if (!window.confirm('Delete team "' + team.name + '"? This cannot be undone.')) return;
    try {
      await axios.delete('/api/teams/' + id);
      toast.success('Team deleted');
      navigate('/teams');
    } catch { toast.error('Failed to delete team'); }
  };

  // Suggestion logic
  const getSuggestion = (m) => {
    const now = new Date();
    const matchDate = new Date(m.match_date);
    const daysUntil = Math.ceil((matchDate - now) / (1000 * 60 * 60 * 24));
    const isMyTeamWinner = m.winner_id === parseInt(id);
    const opponent = m.team1_id === parseInt(id) ? m.team2_name : m.team1_name;

    if (m.status === 'scheduled') {
      if (daysUntil <= 0) return { icon: '⚠️', text: 'Match time has passed — check for result update', color: 'var(--accent)' };
      if (daysUntil === 1) return { icon: '🔥', text: 'Match TOMORROW vs ' + opponent + ' — final preparations!', color: '#f97316' };
      if (daysUntil <= 3) return { icon: '⚡', text: daysUntil + ' days until match vs ' + opponent + ' — focus on tactics', color: 'var(--accent)' };
      return { icon: '📅', text: 'Upcoming in ' + daysUntil + ' days vs ' + opponent, color: 'var(--text-secondary)' };
    }
    if (m.status === 'ongoing') return { icon: '🔴', text: 'LIVE RIGHT NOW vs ' + opponent + '!', color: '#ff4d4d' };
    if (m.status === 'completed') {
      if (isMyTeamWinner) return { icon: '🏆', text: 'WIN vs ' + opponent + ' — Great performance!', color: 'var(--green)' };
      if (!m.winner_id) return { icon: '🤝', text: 'DRAW vs ' + opponent + ' — Keep pushing!', color: 'var(--accent)' };
      return { icon: '💪', text: 'LOSS vs ' + opponent + ' — Learn and improve!', color: 'var(--red)' };
    }
    if (m.status === 'cancelled') return { icon: '🚫', text: 'Match vs ' + opponent + ' was cancelled', color: 'var(--text-muted)' };
    return { icon: '📋', text: 'Check schedule', color: 'var(--text-muted)' };
  };

  const upcomingMatches = matches.filter(m => m.status === 'scheduled' || m.status === 'ongoing');
  const pastMatches = matches.filter(m => m.status === 'completed' || m.status === 'cancelled');

  if (loading) return <div className="loading"><div className="spinner" /></div>;
  if (!team) return <div className="page-content"><p>Team not found.</p></div>;

  const isCaptain = user?.id === team.captain_id;
  const isAdmin = user?.role === 'admin';
  const canManage = isCaptain || isAdmin;

  const winRate = team.wins + team.losses + team.draws > 0
    ? Math.round((team.wins / (team.wins + team.losses + team.draws)) * 100) : 0;

  return (
    <div>
      <div className="top-bar">
        <div>
          <div className="breadcrumb"><Link to="/teams">Teams</Link><span className="breadcrumb-sep">›</span><span>{team.name}</span></div>
          <div className="page-title">{team.name.toUpperCase()}</div>
        </div>
        {canManage && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => { setEditName(team.name); setModalType('edit'); }}>
              <FiEdit2 size={13} /> Edit
            </button>
            {isAdmin && (
              <button className="btn btn-danger btn-sm" onClick={handleDeleteTeam}>
                <FiTrash2 size={13} /> Delete
              </button>
            )}
          </div>
        )}
      </div>

      <div className="page-content">
        {/* Stats + Info */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
          <div className="card">
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, letterSpacing: 1, marginBottom: 16, color: 'var(--text-secondary)' }}>STATS</h3>
            <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
              {[
                { label: 'Wins', value: team.wins, color: 'var(--green)' },
                { label: 'Losses', value: team.losses, color: 'var(--red)' },
                { label: 'Draws', value: team.draws, color: 'var(--accent)' },
                { label: 'Points', value: team.points, color: '#4d9fff' },
              ].map(s => (
                <div key={s.label} style={{ flex: 1, textAlign: 'center', padding: '14px 8px', background: 'var(--bg-secondary)', borderRadius: 8 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 }}>{s.label}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ flex: 1, height: 6, background: 'var(--bg-hover)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: winRate + '%', height: '100%', background: 'var(--green)', borderRadius: 3, transition: 'width 0.5s' }} />
              </div>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', minWidth: 50 }}>{winRate}% win</span>
            </div>
          </div>
          <div className="card">
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, letterSpacing: 1, marginBottom: 12, color: 'var(--text-secondary)' }}>INFO</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { icon: <FiUser size={15} />, label: 'Captain', value: team.captain_name || 'N/A' },
                { icon: <FiCalendar size={15} />, label: 'Created', value: new Date(team.created_at).toLocaleDateString() },
                { icon: <FiUser size={15} />, label: 'Members', value: members.length },
                { icon: <FiActivity size={15} />, label: 'Matches Played', value: matches.filter(m => m.status === 'completed').length },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, fontSize: 14 }}>
                  <span style={{ color: 'var(--accent)', marginTop: 2 }}>{item.icon}</span>
                  <span style={{ color: 'var(--text-muted)' }}>{item.label}:</span>
                  <span>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs">
          {['roster', 'upcoming', 'history'].map(t => (
            <button key={t} className={`tab-btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
              {t === 'roster' ? 'Roster' : t === 'upcoming' ? `Upcoming (${upcomingMatches.length})` : `History (${pastMatches.length})`}
            </button>
          ))}
        </div>

        {/* ROSTER TAB */}
        {tab === 'roster' && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, letterSpacing: 1, color: 'var(--text-secondary)' }}>ROSTER</h3>
              {canManage && (
                <button className="btn btn-secondary btn-sm" onClick={() => { setNewUserId(''); setModalType('addMember'); }}>
                  <FiPlus size={13} /> Add Member
                </button>
              )}
            </div>
            {members.length === 0 ? <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No members yet.</p> : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>#</th><th>Player</th><th>Email</th><th>Joined</th>{canManage && <th></th>}</tr></thead>
                  <tbody>
                    {members.map((m, i) => (
                      <tr key={m.id}>
                        <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: 14, color: '#000' }}>
                              {m.username[0].toUpperCase()}
                            </div>
                            <span style={{ fontWeight: 600 }}>{m.username}</span>
                            {m.id === team.captain_id && <span className="badge badge-admin" style={{ fontSize: 10 }}>Captain</span>}
                          </div>
                        </td>
                        <td style={{ color: 'var(--text-secondary)' }}>{m.email}</td>
                        <td style={{ color: 'var(--text-muted)' }}>{new Date(m.joined_at).toLocaleDateString()}</td>
                        {canManage && (
                          <td>{m.id !== team.captain_id && (
                            <button className="btn btn-danger btn-sm" onClick={() => removeMember(m.id)}><FiTrash2 size={13} /></button>
                          )}</td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* UPCOMING MATCHES TAB */}
        {tab === 'upcoming' && (
          <div>
            {upcomingMatches.length === 0 ? (
              <div className="empty-state"><div className="empty-state-icon">📅</div><h3>No Upcoming Matches</h3></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {upcomingMatches.map(m => {
                  const suggestion = getSuggestion(m);
                  return (
                    <div key={m.id} className="card" style={{ borderLeft: '4px solid ' + suggestion.color }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                        <div>
                          <div style={{ fontFamily: 'var(--font-display)', fontSize: 16 }}>
                            {m.team1_name} <span style={{ color: 'var(--text-muted)' }}>vs</span> {m.team2_name}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{m.tournament_name} • Round {m.round_number}</div>
                        </div>
                        <span className={`badge badge-${m.status}`}>{m.status}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
                        <span>📅 {new Date(m.match_date).toLocaleDateString()} {new Date(m.match_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {m.venue && <span>📍 {m.venue}</span>}
                      </div>
                      <div style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.04)', borderRadius: 8, fontSize: 13, color: suggestion.color, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 16 }}>{suggestion.icon}</span>
                        <span>{suggestion.text}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* HISTORY TAB */}
        {tab === 'history' && (
          <div>
            {pastMatches.length === 0 ? (
              <div className="empty-state"><div className="empty-state-icon">📋</div><h3>No Match History</h3></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {pastMatches.map(m => {
                  const suggestion = getSuggestion(m);
                  const isWin = m.winner_id === parseInt(id);
                  const isDraw = m.status === 'completed' && !m.winner_id;
                  const isLoss = m.status === 'completed' && m.winner_id && !isWin;
                  return (
                    <div key={m.id} className="match-card">
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 80 }}>
                        {new Date(m.match_date).toLocaleDateString()}<br />
                        Round {m.round_number}
                      </div>
                      <div className="match-teams">
                        <div className="team-block">
                          <div className="team-n" style={{ color: m.winner_id === m.team1_id ? 'var(--green)' : 'inherit' }}>{m.team1_name}</div>
                        </div>
                        <div className="vs-block">
                          {m.status === 'completed'
                            ? <div className="vs-score">{m.team1_score} – {m.team2_score}</div>
                            : <div className="vs-text">–</div>}
                          <span className={`badge badge-${m.status}`} style={{ marginTop: 4 }}>{m.status}</span>
                        </div>
                        <div className="team-block right">
                          <div className="team-n" style={{ color: m.winner_id === m.team2_id ? 'var(--green)' : 'inherit' }}>{m.team2_name}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {isWin && <span style={{ color: 'var(--green)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}><FiCheckCircle size={14} />WIN</span>}
                        {isDraw && <span style={{ color: 'var(--accent)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}><FiMinus size={14} />DRAW</span>}
                        {isLoss && <span style={{ color: 'var(--red)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}><FiXCircle size={14} />LOSS</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Team Modal */}
      {modalType === 'edit' && (
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
                  <input className="form-input" value={editName}
                    onChange={e => setEditName(e.target.value)} required />
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

      {/* Add Member Modal */}
      {modalType === 'addMember' && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModalType(null)}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">ADD MEMBER</div>
              <button className="modal-close" onClick={() => setModalType(null)}><FiX size={20} /></button>
            </div>
            <form onSubmit={handleAddMember}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">User ID</label>
                  <input className="form-input" type="number" placeholder="Enter user ID..." value={newUserId}
                    onChange={e => setNewUserId(e.target.value)} required />
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>The user must have an existing account in the system.</div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModalType(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Adding...' : 'Add Member'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
