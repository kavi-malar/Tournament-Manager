import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { FiAward, FiUsers, FiCalendar, FiUser, FiActivity, FiClock, FiShield } from 'react-icons/fi';
import { GiTrophy } from 'react-icons/gi';
import { useAuth } from '../context/AuthContext';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

const CHART_OPTS = {
  plugins: { legend: { labels: { color: '#9898b0', font: { family: 'Outfit' } } } },
  scales: { x: { ticks: { color: '#9898b0' }, grid: { color: 'rgba(255,255,255,0.05)' } }, y: { ticks: { color: '#9898b0' }, grid: { color: 'rgba(255,255,255,0.05)' } } }
};

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    axios.get('/api/dashboard').then(res => setData(res.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  const stats = data?.stats || {};
  const topTeams = data?.topTeams || [];
  const recentMatches = data?.recentMatches || [];
  const sportDist = data?.sportDistribution || [];
  const playerData = data?.playerData;

  const isPlayer = user?.role === 'player';

  const statCards = isPlayer ? [
    { label: 'My Teams', value: playerData?.myTeams?.length || 0, icon: <FiUsers />, color: 'yellow' },
    { label: 'Tournaments', value: playerData?.myTournaments?.length || 0, icon: <FiAward />, color: 'blue' },
    { label: 'Upcoming Matches', value: playerData?.upcomingMatches?.length || 0, icon: <FiCalendar />, color: 'purple' },
    { label: 'Total Tournaments', value: stats.total_tournaments || 0, icon: <GiTrophy />, color: 'green' },
  ] : [
    { label: 'Tournaments', value: stats.total_tournaments || 0, icon: <FiAward />, color: 'yellow' },
    { label: 'Teams', value: stats.total_teams || 0, icon: <FiUsers />, color: 'blue' },
    { label: 'Matches', value: stats.total_matches || 0, icon: <FiCalendar />, color: 'purple' },
    { label: 'Users', value: stats.total_users || 0, icon: <FiUser />, color: 'green' },
    { label: 'Ongoing', value: stats.ongoing || 0, icon: <FiActivity />, color: 'green' },
    { label: 'Upcoming', value: stats.upcoming || 0, icon: <FiClock />, color: 'blue' },
  ];

  const barData = {
    labels: topTeams.map(t => t.name),
    datasets: [
      { label: 'Wins', data: topTeams.map(t => t.wins), backgroundColor: 'rgba(46,204,113,0.7)', borderRadius: 6 },
      { label: 'Losses', data: topTeams.map(t => t.losses), backgroundColor: 'rgba(255,77,77,0.7)', borderRadius: 6 },
      { label: 'Draws', data: topTeams.map(t => t.draws), backgroundColor: 'rgba(240,180,41,0.7)', borderRadius: 6 },
    ]
  };

  const doughnutData = {
    labels: sportDist.map(s => s.sport),
    datasets: [{ data: sportDist.map(s => s.count), backgroundColor: ['#f0b429','#4d9fff','#2ecc71','#a855f7','#ff4d4d'], borderWidth: 0 }]
  };

  return (
    <div>
      <div className="top-bar">
        <div>
          <div className="page-title">DASHBOARD</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>Welcome back, {user?.username} 👋</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FiShield size={16} color="var(--accent)" />
          <span style={{ fontSize: 12, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: 1 }}>{user?.role}</span>
          <span style={{ fontSize: 13, color: 'var(--text-muted)', marginLeft: 8 }}>Arena v2.0</span>
        </div>
      </div>

      <div className="page-content">
        <div className="stats-grid">
          {statCards.map((s, i) => (
            <div key={i} className={`stat-card ${s.color}`}>
              <div className={`stat-icon ${s.color}`}>{s.icon}</div>
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Player-specific section */}
        {isPlayer && playerData && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
            {/* My Upcoming Matches */}
            <div className="card">
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, letterSpacing: 1, marginBottom: 16, color: 'var(--text-secondary)' }}>MY UPCOMING MATCHES</h3>
              {playerData.upcomingMatches.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>No upcoming matches. Register for a tournament!</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {playerData.upcomingMatches.map(m => {
                    const days = Math.ceil((new Date(m.match_date) - new Date()) / (1000 * 60 * 60 * 24));
                    return (
                      <div key={m.id} style={{ padding: '12px 14px', background: 'var(--bg-secondary)', borderRadius: 8, borderLeft: '3px solid ' + (m.status === 'ongoing' ? '#ff4d4d' : 'var(--accent)') }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{m.team1_name} vs {m.team2_name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{m.tournament_name}</div>
                        <div style={{ fontSize: 11, color: m.status === 'ongoing' ? '#ff4d4d' : 'var(--accent)', marginTop: 4 }}>
                          {m.status === 'ongoing' ? '🔴 LIVE NOW' : '📅 In ' + days + ' day' + (days !== 1 ? 's' : '')}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* My Tournaments */}
            <div className="card">
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, letterSpacing: 1, marginBottom: 16, color: 'var(--text-secondary)' }}>MY TOURNAMENTS</h3>
              {playerData.myTournaments.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>
                  Not in any tournaments yet. <Link to="/tournaments" style={{ color: 'var(--accent)' }}>Browse tournaments →</Link>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {playerData.myTournaments.map(t => (
                    <Link to={'/tournaments/' + t.id} key={t.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: 8, fontSize: 13 }}>
                        <div>
                          <div style={{ fontWeight: 600 }}>{t.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{t.sport}</div>
                        </div>
                        <span className={`badge badge-${t.status}`}>{t.status}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* My Teams */}
            <div className="card">
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, letterSpacing: 1, marginBottom: 16, color: 'var(--text-secondary)' }}>MY TEAMS</h3>
              {playerData.myTeams.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>
                  Not in any team. <Link to="/teams" style={{ color: 'var(--accent)' }}>Create or join a team →</Link>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {playerData.myTeams.map(t => (
                    <Link to={'/teams/' + t.id} key={t.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: 8, fontSize: 13 }}>
                        <div style={{ fontWeight: 600 }}>{t.name}</div>
                        <div style={{ display: 'flex', gap: 10 }}>
                          <span style={{ color: 'var(--green)' }}>W{t.wins}</span>
                          <span style={{ color: 'var(--red)' }}>L{t.losses}</span>
                          <span style={{ color: 'var(--accent)', fontFamily: 'var(--font-display)' }}>{t.points}pts</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Admin/Organizer charts */}
        {!isPlayer && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, marginBottom: 24 }}>
              <div className="card">
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, letterSpacing: 1, marginBottom: 20, color: 'var(--text-secondary)' }}>TEAM PERFORMANCE</h3>
                <Bar data={barData} options={CHART_OPTS} />
              </div>
              <div className="card">
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, letterSpacing: 1, marginBottom: 20, color: 'var(--text-secondary)' }}>SPORTS DISTRIBUTION</h3>
                <Doughnut data={doughnutData} options={{ plugins: { legend: { position: 'bottom', labels: { color: '#9898b0', padding: 16 } } } }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div className="card">
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, letterSpacing: 1, marginBottom: 16, color: 'var(--text-secondary)' }}>RECENT MATCHES</h3>
                {recentMatches.length === 0 ? <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>No matches yet</div> : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {recentMatches.map(m => (
                      <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: 8, fontSize: 13 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600 }}>{m.team1_name} <span style={{ color: 'var(--text-muted)' }}>vs</span> {m.team2_name}</div>
                          <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 2 }}>{m.tournament_name}</div>
                        </div>
                        {m.status === 'completed' && (
                          <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--accent)', letterSpacing: 2 }}>{m.team1_score} – {m.team2_score}</div>
                        )}
                        <span className={`badge badge-${m.status}`} style={{ marginLeft: 10 }}>{m.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="card">
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, letterSpacing: 1, marginBottom: 16, color: 'var(--text-secondary)' }}>TOP TEAMS</h3>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Rank</th><th>Team</th><th>W</th><th>L</th><th>Pts</th></tr></thead>
                    <tbody>
                      {topTeams.map((t, i) => (
                        <tr key={t.id}>
                          <td><div className={`rank-badge ${i < 3 ? 'rank-' + (i+1) : 'rank-other'}`}>{i+1}</div></td>
                          <td style={{ fontWeight: 600 }}>{t.name}</td>
                          <td style={{ color: 'var(--green)' }}>{t.wins}</td>
                          <td style={{ color: 'var(--red)' }}>{t.losses}</td>
                          <td style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: 'var(--accent)' }}>{t.points}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
