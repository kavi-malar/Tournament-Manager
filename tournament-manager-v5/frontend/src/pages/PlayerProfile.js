import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FiEdit2, FiCheck, FiX, FiCalendar, FiAward } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';

export default function PlayerProfile() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingBio, setEditingBio] = useState(false);
  const [bio, setBio] = useState('');

  const isOwnProfile = String(user?.id) === String(id);

  const fetchProfile = () => {
    axios.get('/api/users/profile/' + id)
      .then(r => {
        setProfile(r.data);
        setBio(r.data.user?.bio || '');
      })
      .catch(() => toast.error('Failed to load profile'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchProfile(); }, [id]);

  const saveBio = async () => {
    try {
      await axios.put('/api/users/profile', { bio });
      toast.success('Bio updated!');
      setEditingBio(false);
      fetchProfile();
    } catch { toast.error('Failed to update bio'); }
  };

  if (loading) return <div className="loading"><div className="spinner" /></div>;
  if (!profile || !profile.user) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>User not found</div>;

  const { user: u, teams = [], achievements = [], match_history = [], tournaments = [] } = profile || {};

  const totalMatches = teams.reduce((sum, t) => sum + t.wins + t.losses + t.draws, 0);
  const totalWins = teams.reduce((sum, t) => sum + t.wins, 0);
  const totalPoints = teams.reduce((sum, t) => sum + t.points, 0);

  return (
    <div>
      <div className="top-bar">
        <div className="page-title">PLAYER PROFILE</div>
      </div>
      <div className="page-content">
        {/* Profile Header */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ width: 80, height: 80, borderRadius: 20, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 900, color: '#000', flexShrink: 0 }}>
              {u.username[0].toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>{u.username}</h2>
                <span style={{ background: 'var(--accent)', color: '#000', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>{u.role}</span>
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 10 }}>
                <FiCalendar size={12} style={{ marginRight: 4 }} />
                Joined {new Date(u.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
              </div>

              {editingBio ? (
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <textarea
                    value={bio} onChange={e => setBio(e.target.value)}
                    placeholder="Write something about yourself..."
                    style={{ flex: 1, minHeight: 70, padding: 10, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontSize: 13, resize: 'vertical' }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <button className="btn btn-primary btn-sm" onClick={saveBio}><FiCheck size={14} /></button>
                    <button className="btn btn-secondary btn-sm" onClick={() => setEditingBio(false)}><FiX size={14} /></button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <p style={{ margin: 0, fontSize: 13, color: u.bio ? 'var(--text)' : 'var(--text-muted)', fontStyle: u.bio ? 'normal' : 'italic' }}>
                    {u.bio || 'No bio yet.'}
                  </p>
                  {isOwnProfile && (
                    <button className="btn btn-secondary btn-sm" onClick={() => setEditingBio(true)} style={{ flexShrink: 0, padding: '4px 8px' }}>
                      <FiEdit2 size={12} />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Stats row */}
            <div style={{ display: 'flex', gap: 20 }}>
              {[
                { label: 'Teams', value: teams.length },
                { label: 'Matches', value: totalMatches },
                { label: 'Wins', value: totalWins, color: '#22c55e' },
                { label: 'Points', value: totalPoints, color: 'var(--accent)' },
                { label: 'Achievements', value: achievements.length, color: '#a78bfa' },
              ].map(s => (
                <div key={s.label} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: s.color || 'var(--text)' }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Achievements */}
          <div className="card">
            <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <FiAward /> Achievements
            </h3>
            {achievements.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>No achievements yet</div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {achievements.map(a => (
                  <div key={a.id} title={a.description} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--hover-bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 12px' }}>
                    <span style={{ fontSize: 22 }}>{a.badge_icon}</span>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700 }}>{a.badge_name}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{new Date(a.awarded_at).toLocaleDateString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Teams */}
          <div className="card">
            <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700 }}>Teams</h3>
            {teams.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>Not in any team</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {teams.map(t => (
                  <div key={t.id} onClick={() => navigate('/teams/' + t.id)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--hover-bg)', borderRadius: 8, cursor: 'pointer', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, color: '#000' }}>{t.name[0]}</div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{t.name}</div>
                        {t.is_captain ? <div style={{ fontSize: 10, color: 'var(--accent)' }}>Captain</div> : null}
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t.points} pts</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Match history */}
          <div className="card" style={{ gridColumn: '1 / -1' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700 }}>Recent Match History</h3>
            {match_history.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>No completed matches yet</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {match_history.map(m => {
                  const userTeam = teams.find(t => t.id === m.team1_id || t.id === m.team2_id);
                  const won = userTeam && m.winner_id === userTeam.id;
                  const lost = m.winner_id && userTeam && m.winner_id !== userTeam.id;
                  const result = !m.winner_id ? 'D' : won ? 'W' : 'L';
                  const resultColor = result === 'W' ? '#22c55e' : result === 'L' ? '#ef4444' : '#f59e0b';
                  return (
                    <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--hover-bg)', borderRadius: 8, border: '1px solid var(--border)' }}>
                      <div style={{ width: 28, height: 28, borderRadius: 6, background: resultColor + '22', border: '2px solid ' + resultColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 11, color: resultColor, flexShrink: 0 }}>{result}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{m.team1_name} <span style={{ color: 'var(--text-muted)' }}>vs</span> {m.team2_name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.tournament_name} · {new Date(m.match_date).toLocaleDateString()}</div>
                      </div>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>{m.team1_score} – {m.team2_score}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Tournaments participated */}
          <div className="card" style={{ gridColumn: '1 / -1' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700 }}>Tournaments Participated</h3>
            {tournaments.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>No tournaments yet</div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {tournaments.map(t => (
                  <div key={t.id} onClick={() => navigate('/tournaments/' + t.id)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: 'var(--hover-bg)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer' }}>
                    <span style={{ fontSize: 16 }}>🏆</span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 12 }}>{t.name}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{t.sport} · <span className={'badge badge-' + t.status} style={{ fontSize: 9, padding: '1px 5px' }}>{t.status}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}