import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FiCalendar, FiUsers, FiDollarSign, FiUser, FiX, FiPlus, FiEdit2, FiTrash2, FiActivity, FiCheck, FiXCircle, FiZap, FiMessageSquare, FiRefreshCw } from 'react-icons/fi';
import { GiTrophy } from 'react-icons/gi';
import { useAuth } from '../context/AuthContext';

export default function TournamentDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tournament, setTournament] = useState(null);
  const [teams, setTeams] = useState([]);
  const [standings, setStandings] = useState([]);
  const [matches, setMatches] = useState([]);
  const [allTeams, setAllTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');
  const [announcements, setAnnouncements] = useState([]);
  const [announcementForm, setAnnouncementForm] = useState({ title: '', message: '' });
  const [liveRefreshing, setLiveRefreshing] = useState(false);

  // Modal type: 'register'|'addMatch'|'editMatch'|'result'|'editTournament'|'generateFixtures'|null
  const [modalType, setModalType] = useState(null);
  const [regTeamId, setRegTeamId] = useState('');
  const [matchForm, setMatchForm] = useState({ team1_id: '', team2_id: '', match_date: '', venue: '', round_number: 1 });
  const [editMatchData, setEditMatchData] = useState(null);
  const [resultData, setResultData] = useState(null);
  const [resultForm, setResultForm] = useState({ team1_score: 0, team2_score: 0, status: 'completed', notes: '' });
  const [tournForm, setTournForm] = useState({});
  const [fixtureForm, setFixtureForm] = useState({ start_date: '', venue: '' });
  const [saving, setSaving] = useState(false);
  const [myTeamId, setMyTeamId] = useState(null);

  const canManage = user?.role === 'admin' || user?.role === 'organizer';
  const isPlayer = user?.role === 'player';

  const fetchAll = async () => {
    try {
      const [tRes, sRes, mRes, aRes, annRes] = await Promise.all([
        axios.get('/api/tournaments/' + id),
        axios.get('/api/tournaments/' + id + '/standings'),
        axios.get('/api/matches?tournament_id=' + id),
        axios.get('/api/teams'),
        axios.get('/api/tournaments/' + id + '/announcements').catch(() => ({ data: { announcements: [] } })),
      ]);
      setTournament(tRes.data.tournament);
      setTeams(tRes.data.teams);
      setStandings(sRes.data.standings);
      setMatches(mRes.data.matches);
      setAllTeams(aRes.data.teams);
      setAnnouncements(annRes.data.announcements || []);
      if (user) {
        const myTeam = aRes.data.teams.find(t => t.captain_id === user.id);
        if (myTeam) setMyTeamId(myTeam.id);
      }
    } catch { toast.error('Failed to load tournament'); }
    finally { setLoading(false); }
  };

  const refreshLive = async () => {
    setLiveRefreshing(true);
    try {
      const mRes = await axios.get('/api/matches?tournament_id=' + id);
      setMatches(mRes.data.matches);
    } catch (_) {}
    finally { setLiveRefreshing(false); }
  };

  // Auto-refresh ongoing matches every 30s
  useEffect(() => {
    const hasLive = matches.some(m => m.status === 'ongoing');
    if (!hasLive) return;
    const interval = setInterval(refreshLive, 30000);
    return () => clearInterval(interval);
  }, [matches]);

  useEffect(() => { fetchAll(); }, [id]);

  const handlePostAnnouncement = async (e) => {
    e.preventDefault();
    if (!announcementForm.title || !announcementForm.message) return toast.error('Title and message required');
    try {
      await axios.post('/api/tournaments/' + id + '/announcements', announcementForm);
      toast.success('Announcement posted!');
      setAnnouncementForm({ title: '', message: '' });
      fetchAll();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to post'); }
  };

  const handleDeleteAnnouncement = async (annId) => {
    if (!window.confirm('Delete this announcement?')) return;
    try {
      await axios.delete('/api/tournaments/' + id + '/announcements/' + annId);
      toast.success('Deleted');
      fetchAll();
    } catch (err) { toast.error('Failed to delete'); }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    const teamId = isPlayer ? myTeamId : regTeamId;
    try {
      await axios.post('/api/tournaments/' + id + '/register', { team_id: teamId });
      toast.success('Team registered!');
      setModalType(null);
      fetchAll();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to register'); }
  };

  const handleCreateMatch = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/matches', { ...matchForm, tournament_id: id });
      toast.success('Match scheduled!');
      setModalType(null);
      setMatchForm({ team1_id: '', team2_id: '', match_date: '', venue: '', round_number: 1 });
      fetchAll();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleEditMatch = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await axios.put('/api/matches/' + editMatchData.id, editMatchData);
      toast.success('Match updated!');
      setModalType(null);
      fetchAll();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleResult = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await axios.put('/api/matches/' + resultData.id + '/result', resultForm);
      toast.success('Score saved! Stats updated by DB trigger.');
      setModalType(null);
      fetchAll();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleCancelMatch = async (m) => {
    if (!window.confirm('Cancel match: ' + m.team1_name + ' vs ' + m.team2_name + '?')) return;
    try {
      await axios.put('/api/matches/' + m.id + '/cancel');
      toast.success('Match cancelled');
      fetchAll();
    } catch (err) { toast.error(err.response?.data?.message || 'Cannot cancel'); }
  };

  const handleDeleteMatch = async (m) => {
    if (!window.confirm('Delete this match?')) return;
    try {
      await axios.delete('/api/matches/' + m.id);
      toast.success('Match deleted');
      fetchAll();
    } catch { toast.error('Failed to delete match'); }
  };

  const handleEditTournament = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await axios.put('/api/tournaments/' + id, tournForm);
      toast.success('Tournament updated!');
      setModalType(null);
      fetchAll();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleDeleteTournament = async () => {
    if (!window.confirm('Delete "' + tournament.name + '"? All data will be lost.')) return;
    try {
      await axios.delete('/api/tournaments/' + id);
      toast.success('Tournament deleted');
      navigate('/tournaments');
    } catch { toast.error('Failed to delete'); }
  };

  const handleGenerateFixtures = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await axios.post('/api/tournaments/' + id + '/generate-fixtures', fixtureForm);
      toast.success(res.data.message);
      setModalType(null);
      fetchAll();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to generate fixtures'); }
    finally { setSaving(false); }
  };

  const openResult = (m) => {
    setResultData(m);
    setResultForm({ team1_score: m.team1_score || 0, team2_score: m.team2_score || 0, status: 'completed', notes: m.notes || '' });
    setModalType('result');
  };

  const isMyTeamRegistered = myTeamId && teams.find(t => t.id === myTeamId);

  if (loading) return <div className="loading"><div className="spinner" /></div>;
  if (!tournament) return <div className="page-content"><p>Tournament not found.</p></div>;

  const fmt = s => s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const totalMatches = matches.length;
  const completedMatches = matches.filter(m => m.status === 'completed').length;
  const progress = totalMatches > 0 ? Math.round((completedMatches / totalMatches) * 100) : 0;

  return (
    <div>
      <div className="top-bar">
        <div>
          <div className="breadcrumb"><Link to="/tournaments">Tournaments</Link><span className="breadcrumb-sep">›</span><span>{tournament.name}</span></div>
          <div className="page-title">{tournament.name.toUpperCase()}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className={`badge badge-${tournament.status}`} style={{ fontSize: 13, padding: '6px 14px' }}>{tournament.status}</span>
          {canManage && (
            <>
              <button className="btn btn-secondary btn-sm" onClick={() => { setTournForm({ ...tournament, start_date: tournament.start_date?.slice(0,10), end_date: tournament.end_date?.slice(0,10) }); setModalType('editTournament'); }}>
                <FiEdit2 size={13} /> Edit
              </button>
              {user?.role === 'admin' && (
                <button className="btn btn-danger btn-sm" onClick={handleDeleteTournament}><FiTrash2 size={13} /> Delete</button>
              )}
            </>
          )}
          {isPlayer && !isMyTeamRegistered && myTeamId && (tournament.status === 'upcoming' || tournament.status === 'ongoing') && (
            <button className="btn btn-primary btn-sm" onClick={() => setModalType('register')}>+ Register My Team</button>
          )}
          {isPlayer && isMyTeamRegistered && (
            <span style={{ fontSize: 12, color: 'var(--green)', padding: '6px 12px', background: 'rgba(46,204,113,0.1)', borderRadius: 6 }}>✓ Registered</span>
          )}
        </div>
      </div>

      <div className="page-content">
        {/* Meta chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          {[
            { icon: <GiTrophy />, label: tournament.sport },
            { icon: <FiUsers />, label: teams.length + '/' + tournament.max_teams + ' Teams' },
            { icon: <FiCalendar />, label: new Date(tournament.start_date).toLocaleDateString() + ' – ' + new Date(tournament.end_date).toLocaleDateString() },
            { icon: <FiUser />, label: 'By ' + tournament.organizer_name },
            ...(tournament.prize_pool ? [{ icon: <FiDollarSign />, label: tournament.prize_pool }] : []),
            { icon: null, label: fmt(tournament.format) },
          ].map((m, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 13px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
              {m.icon && <span style={{ color: 'var(--accent)' }}>{m.icon}</span>}{m.label}
            </div>
          ))}
        </div>

        {/* Progress bar */}
        {totalMatches > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
              <span>Tournament Progress</span>
              <span>{completedMatches}/{totalMatches} matches completed ({progress}%)</span>
            </div>
            <div style={{ height: 6, background: 'var(--bg-hover)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ width: progress + '%', height: '100%', background: 'var(--accent)', borderRadius: 3, transition: 'width 0.5s' }} />
            </div>
          </div>
        )}

        <div className="tabs">
          {['overview', 'standings', 'matches', 'bracket', 'teams', 'announcements'].map(t => (
            <button key={t} className={`tab-btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
              {t === 'announcements' ? `📢 ${t.charAt(0).toUpperCase() + t.slice(1)}${announcements.length ? ` (${announcements.length})` : ''}` : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* OVERVIEW */}
        {tab === 'overview' && (
          <div className="card">
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, letterSpacing: 1, marginBottom: 12 }}>ABOUT</h3>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>{tournament.description || 'No description provided.'}</p>
          </div>
        )}

        {/* STANDINGS */}
        {tab === 'standings' && (
          <div className="card">
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, letterSpacing: 1, marginBottom: 16 }}>STANDINGS</h3>
            <div className="table-wrap">
              <table>
                <thead><tr><th>#</th><th>Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>Pts</th></tr></thead>
                <tbody>
                  {standings.length === 0 ? (
                    <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No standings yet</td></tr>
                  ) : standings.map((s, i) => (
                    <tr key={s.team_id}>
                      <td><div className={`rank-badge ${i < 3 ? 'rank-' + (i+1) : 'rank-other'}`}>{i+1}</div></td>
                      <td style={{ fontWeight: 600 }}>{s.team_name}</td>
                      <td>{s.played}</td>
                      <td style={{ color: 'var(--green)' }}>{s.wins}</td>
                      <td style={{ color: 'var(--accent)' }}>{s.draws}</td>
                      <td style={{ color: 'var(--red)' }}>{s.losses}</td>
                      <td><strong style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--accent)' }}>{s.points}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* MATCHES */}
        {tab === 'matches' && (
          <div>
            {canManage && (
              <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                <button className="btn btn-primary" onClick={() => setModalType('addMatch')}><FiPlus size={15} /> Schedule Match</button>
                <button className="btn btn-secondary" onClick={() => { setFixtureForm({ start_date: tournament.start_date?.slice(0,10), venue: '' }); setModalType('generateFixtures'); }}>
                  <FiZap size={15} /> Auto-Generate Fixtures
                </button>
                <button className="btn btn-secondary" onClick={refreshLive} disabled={liveRefreshing} title="Refresh scores">
                  <FiRefreshCw size={15} style={{ animation: liveRefreshing ? 'spin 1s linear infinite' : 'none' }} />
                </button>
              </div>
            )}
            {matches.some(m => m.status === 'ongoing') && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, marginBottom: 12, fontSize: 12 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', display: 'inline-block', animation: 'pulse 1.5s ease-in-out infinite' }} />
                <strong style={{ color: '#ef4444' }}>LIVE</strong>
                <span style={{ color: 'var(--text-muted)' }}>— Scores refresh automatically every 30 seconds</span>
              </div>
            )}
            {matches.length === 0 ? (
              <div className="empty-state"><div className="empty-state-icon">⚽</div><h3>No Matches Scheduled</h3></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {matches.map(m => (
                  <div key={m.id} className="match-card" style={{ border: m.status === 'ongoing' ? '1px solid rgba(239,68,68,0.4)' : undefined }}>
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
                        {m.status === 'completed' ? <div className="vs-score">{m.team1_score} – {m.team2_score}</div>
                          : m.status === 'ongoing' ? <div className="vs-score" style={{ color: '#ef4444' }}>{m.team1_score} – {m.team2_score}</div>
                          : <div className="vs-text">VS</div>}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                          {m.status === 'ongoing' && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444', display: 'inline-block', animation: 'pulse 1.5s ease-in-out infinite' }} />}
                          <span className={`badge badge-${m.status}`}>{m.status === 'ongoing' ? 'LIVE' : m.status}</span>
                        </div>
                      </div>
                      <div className="team-block right">
                        <div className="team-n" style={{ color: m.winner_id === m.team2_id ? 'var(--accent)' : 'inherit' }}>{m.team2_name}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'right', minWidth: 90 }}>
                      {m.venue && <div>📍 {m.venue}</div>}
                      {m.winner_name && <div style={{ color: 'var(--green)' }}>🏆 {m.winner_name}</div>}
                    </div>
                    {canManage && (
                      <div style={{ display: 'flex', gap: 5, marginLeft: 8, flexShrink: 0 }}>
                        <button className="btn btn-secondary btn-sm" title="Update Score" onClick={() => openResult(m)}><FiActivity size={13} /></button>
                        <button className="btn btn-secondary btn-sm" title="Edit" onClick={() => { setEditMatchData({ ...m, match_date: m.match_date?.slice(0,16) }); setModalType('editMatch'); }}><FiEdit2 size={13} /></button>
                        {['scheduled','ongoing'].includes(m.status) && (
                          <button className="btn btn-danger btn-sm" title="Cancel" onClick={() => handleCancelMatch(m)}><FiXCircle size={13} /></button>
                        )}
                        <button className="btn btn-danger btn-sm" title="Delete" onClick={() => handleDeleteMatch(m)}><FiTrash2 size={13} /></button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* BRACKET */}
        {tab === 'bracket' && (
          <div className="card">
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, letterSpacing: 1, marginBottom: 16 }}>BRACKET</h3>
            {matches.length === 0 ? (
              <div className="empty-state"><div className="empty-state-icon">🏆</div><h3>No matches yet</h3>{canManage && <p>Generate fixtures to see the bracket.</p>}</div>
            ) : (() => {
              const rounds = matches.reduce((acc, m) => {
                if (!acc[m.round_number]) acc[m.round_number] = [];
                acc[m.round_number].push(m);
                return acc;
              }, {});
              return (
                <div style={{ display: 'flex', gap: 24, overflowX: 'auto', paddingBottom: 16 }}>
                  {Object.entries(rounds).map(([round, roundMatches]) => (
                    <div key={round} style={{ minWidth: 200 }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, letterSpacing: 1, color: 'var(--accent)', marginBottom: 12, textAlign: 'center' }}>
                        ROUND {round}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {roundMatches.map(m => (
                          <div key={m.id} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                            {[
                              { name: m.team1_name, score: m.team1_score, isWinner: m.winner_id === m.team1_id },
                              { name: m.team2_name, score: m.team2_score, isWinner: m.winner_id === m.team2_id },
                            ].map((team, ti) => (
                              <div key={ti} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderBottom: ti === 0 ? '1px solid var(--border)' : 'none', background: team.isWinner ? 'rgba(240,180,41,0.1)' : 'transparent' }}>
                                <span style={{ fontSize: 13, fontWeight: team.isWinner ? 700 : 400, color: team.isWinner ? 'var(--accent)' : 'var(--text-primary)' }}>{team.name}</span>
                                {m.status === 'completed' && (
                                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: team.isWinner ? 'var(--accent)' : 'var(--text-muted)' }}>{team.score}</span>
                                )}
                              </div>
                            ))}
                            <div style={{ padding: '4px 12px', fontSize: 11, color: 'var(--text-muted)' }}>
                              <span className={`badge badge-${m.status}`}>{m.status}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {/* TEAMS */}
        {tab === 'teams' && (
          <div>
            {canManage && (
              <div style={{ marginBottom: 16 }}>
                <button className="btn btn-primary" onClick={() => setModalType('register')}><FiPlus size={15} /> Register Team</button>
              </div>
            )}
            {teams.length === 0 ? (
              <div className="empty-state"><div className="empty-state-icon"><GiTrophy /></div><h3>No Teams Registered</h3></div>
            ) : (
              <div className="grid-3">
                {teams.map(t => (
                  <Link to={'/teams/' + t.id} key={t.id}>
                    <div className="card" style={{ cursor: 'pointer' }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, marginBottom: 8 }}>{t.name}</div>
                      <div style={{ display: 'flex', gap: 12, fontSize: 13 }}>
                        <span style={{ color: 'var(--green)' }}>W {t.wins}</span>
                        <span style={{ color: 'var(--red)' }}>L {t.losses}</span>
                        <span style={{ color: 'var(--accent)' }}>D {t.draws}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ANNOUNCEMENTS */}
        {tab === 'announcements' && (
          <div>
            {canManage && (
              <div className="card" style={{ marginBottom: 16 }}>
                <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700 }}>📢 Post Announcement</h3>
                <form onSubmit={handlePostAnnouncement}>
                  <div className="form-group">
                    <label className="form-label">Title</label>
                    <input className="form-input" placeholder="e.g. Match postponed, Venue change..." value={announcementForm.title} onChange={e => setAnnouncementForm(f => ({ ...f, title: e.target.value }))} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Message</label>
                    <textarea className="form-input" rows={3} placeholder="Full announcement details..." value={announcementForm.message} onChange={e => setAnnouncementForm(f => ({ ...f, message: e.target.value }))} required style={{ resize: 'vertical' }} />
                  </div>
                  <button type="submit" className="btn btn-primary"><FiMessageSquare size={14} /> Post Announcement</button>
                </form>
              </div>
            )}
            {announcements.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📢</div>
                <h3>No Announcements</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>{canManage ? 'Post an announcement above.' : 'The organizer has not posted any announcements yet.'}</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {announcements.map(a => (
                  <div key={a.id} className="card" style={{ borderLeft: '3px solid var(--accent)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 15 }}>{a.title}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                          by {a.author_name} · {new Date(a.created_at).toLocaleString()}
                        </div>
                      </div>
                      {canManage && (
                        <button className="btn btn-danger btn-sm" onClick={() => handleDeleteAnnouncement(a.id)}><FiTrash2 size={12} /></button>
                      )}
                    </div>
                    <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: 'var(--text)' }}>{a.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* REGISTER TEAM */}
      {modalType === 'register' && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModalType(null)}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">REGISTER TEAM</div>
              <button className="modal-close" onClick={() => setModalType(null)}><FiX size={20} /></button>
            </div>
            <form onSubmit={handleRegister}>
              <div className="modal-body">
                {isPlayer && myTeamId ? (
                  <div>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: 12, fontSize: 14 }}>Register your team for this tournament:</p>
                    <div style={{ padding: '12px 16px', background: 'rgba(77,159,255,0.1)', border: '1px solid rgba(77,159,255,0.2)', borderRadius: 8 }}>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Your Team</div>
                      <div style={{ fontWeight: 600, marginTop: 4 }}>{allTeams.find(t => t.id === myTeamId)?.name}</div>
                    </div>
                  </div>
                ) : (
                  <div className="form-group">
                    <label className="form-label">Select Team</label>
                    <select className="form-select" value={regTeamId} onChange={e => setRegTeamId(e.target.value)} required>
                      <option value="">-- Choose Team --</option>
                      {allTeams.filter(t => !teams.find(rt => rt.id === t.id)).map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModalType(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Register</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SCHEDULE MATCH */}
      {modalType === 'addMatch' && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModalType(null)}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">SCHEDULE MATCH</div>
              <button className="modal-close" onClick={() => setModalType(null)}><FiX size={20} /></button>
            </div>
            <form onSubmit={handleCreateMatch}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Team 1</label>
                    <select className="form-select" value={matchForm.team1_id} onChange={e => setMatchForm(f => ({ ...f, team1_id: e.target.value }))} required>
                      <option value="">Select</option>
                      {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Team 2</label>
                    <select className="form-select" value={matchForm.team2_id} onChange={e => setMatchForm(f => ({ ...f, team2_id: e.target.value }))} required>
                      <option value="">Select</option>
                      {teams.filter(t => String(t.id) !== String(matchForm.team1_id)).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Date & Time</label>
                    <input className="form-input" type="datetime-local" value={matchForm.match_date} onChange={e => setMatchForm(f => ({ ...f, match_date: e.target.value }))} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Round</label>
                    <input className="form-input" type="number" min="1" value={matchForm.round_number} onChange={e => setMatchForm(f => ({ ...f, round_number: e.target.value }))} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Venue</label>
                  <input className="form-input" placeholder="Stadium..." value={matchForm.venue} onChange={e => setMatchForm(f => ({ ...f, venue: e.target.value }))} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModalType(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Schedule</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MATCH */}
      {modalType === 'editMatch' && editMatchData && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModalType(null)}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">EDIT MATCH</div>
              <button className="modal-close" onClick={() => setModalType(null)}><FiX size={20} /></button>
            </div>
            <form onSubmit={handleEditMatch}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Team 1</label>
                    <select className="form-select" value={editMatchData.team1_id} onChange={e => setEditMatchData(f => ({ ...f, team1_id: e.target.value }))}>
                      {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Team 2</label>
                    <select className="form-select" value={editMatchData.team2_id} onChange={e => setEditMatchData(f => ({ ...f, team2_id: e.target.value }))}>
                      {teams.filter(t => String(t.id) !== String(editMatchData.team1_id)).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Date & Time</label>
                    <input className="form-input" type="datetime-local" value={editMatchData.match_date || ''} onChange={e => setEditMatchData(f => ({ ...f, match_date: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Round</label>
                    <input className="form-input" type="number" min="1" value={editMatchData.round_number} onChange={e => setEditMatchData(f => ({ ...f, round_number: e.target.value }))} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Venue</label>
                  <input className="form-input" value={editMatchData.venue || ''} onChange={e => setEditMatchData(f => ({ ...f, venue: e.target.value }))} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModalType(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* UPDATE SCORE */}
      {modalType === 'result' && resultData && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModalType(null)}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">UPDATE SCORE</div>
              <button className="modal-close" onClick={() => setModalType(null)}><FiX size={20} /></button>
            </div>
            <form onSubmit={handleResult}>
              <div className="modal-body">
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16, padding: 16, background: 'var(--bg-secondary)', borderRadius: 10 }}>
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>{resultData.team1_name}</div>
                    <input className="form-input" type="number" min="0"
                      style={{ textAlign: 'center', fontSize: 28, fontFamily: 'var(--font-display)', padding: '8px' }}
                      value={resultForm.team1_score}
                      onChange={e => setResultForm(f => ({ ...f, team1_score: parseInt(e.target.value) || 0 }))} />
                  </div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--text-muted)' }}>–</div>
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>{resultData.team2_name}</div>
                    <input className="form-input" type="number" min="0"
                      style={{ textAlign: 'center', fontSize: 28, fontFamily: 'var(--font-display)', padding: '8px' }}
                      value={resultForm.team2_score}
                      onChange={e => setResultForm(f => ({ ...f, team2_score: parseInt(e.target.value) || 0 }))} />
                  </div>
                </div>
                {resultForm.team1_score !== resultForm.team2_score ? (
                  <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--green)', marginBottom: 12 }}>
                    <FiCheck size={13} style={{ marginRight: 4 }} />
                    Winner: <strong>{resultForm.team1_score > resultForm.team2_score ? resultData.team1_name : resultData.team2_name}</strong>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--accent)', marginBottom: 12 }}>Draw</div>
                )}
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-select" value={resultForm.status} onChange={e => setResultForm(f => ({ ...f, status: e.target.value }))}>
                    <option value="ongoing">Ongoing</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <textarea className="form-textarea" value={resultForm.notes} onChange={e => setResultForm(f => ({ ...f, notes: e.target.value }))} />
                </div>
                <div style={{ padding: '10px 12px', background: 'rgba(240,180,41,0.08)', border: '1px solid rgba(240,180,41,0.2)', borderRadius: 8, fontSize: 12, color: 'var(--text-muted)' }}>
                  ⚡ Stats auto-updated via MySQL TRIGGER.
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

      {/* GENERATE FIXTURES */}
      {modalType === 'generateFixtures' && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModalType(null)}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">AUTO-GENERATE FIXTURES</div>
              <button className="modal-close" onClick={() => setModalType(null)}><FiX size={20} /></button>
            </div>
            <form onSubmit={handleGenerateFixtures}>
              <div className="modal-body">
                <div style={{ padding: '12px 14px', background: 'rgba(240,180,41,0.08)', border: '1px solid rgba(240,180,41,0.2)', borderRadius: 8, fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
                  <strong style={{ color: 'var(--accent)' }}>⚡ Auto-Generate</strong><br />
                  This will create matches for all registered teams using the <strong>{fmt(tournament.format)}</strong> format.
                  Any existing <em>scheduled</em> matches will be replaced.
                </div>
                <div className="form-group">
                  <label className="form-label">Start Date</label>
                  <input className="form-input" type="date" value={fixtureForm.start_date}
                    onChange={e => setFixtureForm(f => ({ ...f, start_date: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Default Venue</label>
                  <input className="form-input" placeholder="Main Stadium" value={fixtureForm.venue}
                    onChange={e => setFixtureForm(f => ({ ...f, venue: e.target.value }))} />
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  Registered teams: <strong style={{ color: 'var(--text-primary)' }}>{teams.length}</strong>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModalType(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving || teams.length < 2}>
                  {saving ? 'Generating...' : 'Generate ' + (tournament.format === 'round_robin' || tournament.format === 'league' ? teams.length * (teams.length - 1) / 2 : Math.floor(teams.length / 2)) + ' Matches'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT TOURNAMENT */}
      {modalType === 'editTournament' && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModalType(null)}>
          <div className="modal" style={{ maxWidth: 640 }}>
            <div className="modal-header">
              <div className="modal-title">EDIT TOURNAMENT</div>
              <button className="modal-close" onClick={() => setModalType(null)}><FiX size={20} /></button>
            </div>
            <form onSubmit={handleEditTournament}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Name</label>
                  <input className="form-input" value={tournForm.name || ''} onChange={e => setTournForm(f => ({ ...f, name: e.target.value }))} required />
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Sport</label>
                    <input className="form-input" value={tournForm.sport || ''} onChange={e => setTournForm(f => ({ ...f, sport: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select className="form-select" value={tournForm.status || ''} onChange={e => setTournForm(f => ({ ...f, status: e.target.value }))}>
                      {['upcoming','ongoing','completed','cancelled'].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Max Teams</label>
                    <input className="form-input" type="number" min="2" value={tournForm.max_teams || ''} onChange={e => setTournForm(f => ({ ...f, max_teams: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Prize Pool</label>
                    <input className="form-input" value={tournForm.prize_pool || ''} onChange={e => setTournForm(f => ({ ...f, prize_pool: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Start Date</label>
                    <input className="form-input" type="date" value={tournForm.start_date || ''} onChange={e => setTournForm(f => ({ ...f, start_date: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">End Date</label>
                    <input className="form-input" type="date" value={tournForm.end_date || ''} onChange={e => setTournForm(f => ({ ...f, end_date: e.target.value }))} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-textarea" value={tournForm.description || ''} onChange={e => setTournForm(f => ({ ...f, description: e.target.value }))} />
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
