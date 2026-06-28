import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FiAward, FiTrendingUp } from 'react-icons/fi';

const RANK_COLORS = { 1: '#FFD700', 2: '#C0C0C0', 3: '#CD7F32' };
const RANK_EMOJIS = { 1: '🥇', 2: '🥈', 3: '🥉' };

export default function Leaderboard() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    axios.get('/api/users/leaderboard')
      .then(r => setData(r.data.leaderboard || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div>
      <div className="top-bar">
        <div className="page-title">🏆 LEADERBOARD</div>
      </div>
      <div className="page-content">

        {/* Top 3 podium */}
        {data.length >= 3 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 32, alignItems: 'flex-end' }}>
            {[data[1], data[0], data[2]].map((team, idx) => {
              const actualRank = [2, 1, 3][idx];
              const heights = [140, 170, 120];
              return (
                <div key={team.id} onClick={() => navigate('/teams/' + team.id)}
                  style={{ cursor: 'pointer', textAlign: 'center', width: 140 }}>
                  <div style={{ fontSize: 32, marginBottom: 6 }}>{RANK_EMOJIS[actualRank]}</div>
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4, color: 'var(--text)' }}>{team.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>{team.points} pts</div>
                  <div style={{
                    height: heights[idx], background: RANK_COLORS[actualRank] + '33',
                    border: '2px solid ' + RANK_COLORS[actualRank],
                    borderRadius: '8px 8px 0 0', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: 28, fontWeight: 900, color: RANK_COLORS[actualRank]
                  }}>
                    {actualRank}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Full table */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Rank', 'Team', 'Captain', 'W', 'L', 'D', 'Points', 'Win Rate', 'Tournaments'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: h === 'Team' || h === 'Captain' ? 'left' : 'center', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((team, i) => (
                  <tr key={team.id}
                    onClick={() => navigate('/teams/' + team.id)}
                    style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--hover-bg)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 800, color: RANK_COLORS[team.rank] || 'var(--text-muted)' }}>
                      {RANK_EMOJIS[team.rank] || team.rank}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, color: '#000', flexShrink: 0 }}>
                          {team.name[0]}
                        </div>
                        <span style={{ fontWeight: 600, fontSize: 14 }}>{team.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 13, color: 'var(--text-muted)' }}>{team.captain_name}</td>
                    <td style={{ padding: '12px 14px', textAlign: 'center', color: '#22c55e', fontWeight: 700 }}>{team.wins}</td>
                    <td style={{ padding: '12px 14px', textAlign: 'center', color: '#ef4444', fontWeight: 700 }}>{team.losses}</td>
                    <td style={{ padding: '12px 14px', textAlign: 'center', color: '#f59e0b', fontWeight: 700 }}>{team.draws}</td>
                    <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 800, color: 'var(--accent)' }}>{team.points}</td>
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                        <div style={{ width: 60, height: 6, borderRadius: 3, background: 'var(--border)', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: team.win_rate + '%', background: '#22c55e', borderRadius: 3 }} />
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{team.win_rate}%</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>{team.tournament_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {data.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon"><FiAward /></div>
            <h3>No teams yet</h3>
            <p>Teams will appear here once they start competing.</p>
          </div>
        )}
      </div>
    </div>
  );
}
