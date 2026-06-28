const db = require('../config/db');

exports.getDashboardStats = async (req, res) => {
  try {
    const [[{ total_tournaments }]] = await db.query('SELECT COUNT(*) as total_tournaments FROM tournaments');
    const [[{ total_teams }]] = await db.query('SELECT COUNT(*) as total_teams FROM teams');
    const [[{ total_matches }]] = await db.query('SELECT COUNT(*) as total_matches FROM matches');
    const [[{ total_users }]] = await db.query('SELECT COUNT(*) as total_users FROM users');
    const [[{ ongoing }]] = await db.query("SELECT COUNT(*) as ongoing FROM tournaments WHERE status='ongoing'");
    const [[{ upcoming }]] = await db.query("SELECT COUNT(*) as upcoming FROM tournaments WHERE status='upcoming'");
    const [[{ completed }]] = await db.query("SELECT COUNT(*) as completed FROM matches WHERE status='completed'");

    const [recentMatches] = await db.query(
      `SELECT m.*, t1.name as team1_name, t2.name as team2_name, t.name as tournament_name
       FROM matches m
       JOIN teams t1 ON m.team1_id = t1.id
       JOIN teams t2 ON m.team2_id = t2.id
       JOIN tournaments t ON m.tournament_id = t.id
       ORDER BY m.match_date DESC LIMIT 5`
    );

    const [topTeams] = await db.query('SELECT id, name, wins, losses, draws, points FROM teams ORDER BY points DESC LIMIT 5');
    const [sportDistribution] = await db.query('SELECT sport, COUNT(*) as count FROM tournaments GROUP BY sport');

    // Player-specific data
    let playerData = null;
    if (req.user && req.user.role === 'player') {
      const [myTeams] = await db.query(
        `SELECT t.id, t.name, t.wins, t.losses, t.draws, t.points
         FROM teams t JOIN team_members tm ON t.id = tm.team_id WHERE tm.user_id = ?`,
        [req.user.id]
      );
      const [myTournaments] = await db.query(
        `SELECT DISTINCT t.id, t.name, t.sport, t.status, t.start_date, t.end_date
         FROM tournaments t
         JOIN tournament_registrations tr ON t.id = tr.tournament_id
         JOIN team_members tm ON tr.team_id = tm.team_id
         WHERE tm.user_id = ? ORDER BY t.start_date DESC LIMIT 5`,
        [req.user.id]
      );
      const [upcomingMatches] = await db.query(
        `SELECT m.*, t1.name as team1_name, t2.name as team2_name, t.name as tournament_name
         FROM matches m
         JOIN teams t1 ON m.team1_id = t1.id
         JOIN teams t2 ON m.team2_id = t2.id
         JOIN tournaments t ON m.tournament_id = t.id
         JOIN team_members tm ON (tm.team_id = m.team1_id OR tm.team_id = m.team2_id)
         WHERE tm.user_id = ? AND m.status IN ('scheduled','ongoing')
         ORDER BY m.match_date ASC LIMIT 5`,
        [req.user.id]
      );
      playerData = { myTeams, myTournaments, upcomingMatches };
    }

    res.json({
      success: true,
      stats: { total_tournaments, total_teams, total_matches, total_users, ongoing, upcoming, completed_matches: completed },
      recentMatches,
      topTeams,
      sportDistribution,
      playerData
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
