# 🏆 Arena - Tournament Manager
### MERN Stack + MySQL | DBMS College Project

A full-featured tournament management system built with React, Node.js, Express, and MySQL.

---

## 📦 Tech Stack

| Layer     | Technology                        |
|-----------|-----------------------------------|
| Frontend  | React 18, React Router v6, Chart.js |
| Backend   | Node.js, Express.js               |
| Database  | MySQL 8.0                         |
| Auth      | JWT (JSON Web Tokens)             |
| Styling   | Custom CSS (no UI framework)      |

---

## 🚀 Setup Instructions

### Prerequisites
- Node.js v18+
- MySQL 8.0+
- npm or yarn

---

### Step 1: Database Setup

1. Open MySQL Workbench or terminal
2. Run the SQL schema:

```bash
mysql -u root -p < database/schema.sql

//
mysql -u root -p
USE TOurnament_manager
 SOURCE C:/Users/kaviy/Downloads/tournament-manager-v51/tournament-manager-v5/database/schema.sql;
```

Or open MySQL and paste the contents of `database/schema.sql`.

---

### Step 2: Backend Setup

```bash
cd backend
npm install
```

Edit `.env` file with your MySQL credentials:
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=tournament_manager
JWT_SECRET=tournament_super_secret_key_2025
PORT=5000
```

Start the backend:
```bash
npm run dev
```

Backend runs at: `http://localhost:5000`

---

### Step 3: Frontend Setup

```bash
cd frontend
npm install
npm start
```

Frontend runs at: `http://localhost:3000`

---



> Note: These are hashed with bcrypt in the seed data. Use them after running the schema.

---

## 📁 Project Structure

```
tournament-manager/
├── database/
│   └── schema.sql              # MySQL schema + seed data
├── backend/
│   ├── config/
│   │   └── db.js               # MySQL connection pool
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── tournamentController.js
│   │   ├── teamController.js
│   │   ├── matchController.js
│   │   └── dashboardController.js
│   ├── middleware/
│   │   └── auth.js             # JWT middleware
│   ├── routes/
│   │   ├── auth.js
│   │   ├── tournaments.js
│   │   ├── teams.js
│   │   ├── matches.js
│   │   └── dashboard.js
│   ├── .env
│   ├── package.json
│   └── server.js
└── frontend/
    ├── public/
    │   └── index.html
    └── src/
        ├── context/
        │   └── AuthContext.js
        ├── components/
        │   └── Layout.js
        ├── pages/
        │   ├── Login.js
        │   ├── Register.js
        │   ├── Dashboard.js
        │   ├── Tournaments.js
        │   ├── TournamentDetail.js
        │   ├── Teams.js
        │   ├── TeamDetail.js
        │   └── Matches.js
        ├── App.js
        ├── index.js
        └── index.css
```

---

## 🎯 Features

### Authentication
- JWT-based login & registration
- Role-based access:  Organizer, Player
- Protected routes

### Tournaments
- Create, view, update tournaments
- Multiple formats: Single/Double Elimination, Round Robin, League
- Register teams to tournaments
- Real-time standings via MySQL View

### Teams
- Create and manage teams
- Add/remove members
- Win/loss/draw stats with win rate bar

### Matches
- Schedule matches between teams
- Update scores and results
- Auto-calculates winner and updates team stats
- Grouped by tournament view

### Dashboard
- Live statistics (tournaments, teams, matches, users)
- Bar chart: Team performance (Chart.js)
- Doughnut chart: Sports distribution
- Recent matches feed
- Top teams leaderboard

---

## 🗃️ Database Design

### Tables
- `users` - authentication and roles
- `teams` - team records with aggregated stats
- `team_members` - many-to-many: users ↔ teams
- `tournaments` - tournament metadata
- `tournament_registrations` - many-to-many: teams ↔ tournaments
- `matches` - match schedule and results

### Views
- `tournament_standings` - dynamic standings calculated from match results

---

## 📊 API Endpoints

| Method | Endpoint                          | Description              |
|--------|-----------------------------------|--------------------------|
| POST   | /api/auth/register                | Register user            |
| POST   | /api/auth/login                   | Login                    |
| GET    | /api/auth/profile                 | Get current user         |
| GET    | /api/tournaments                  | List all tournaments     |
| POST   | /api/tournaments                  | Create tournament        |
| GET    | /api/tournaments/:id              | Tournament details       |
| PUT    | /api/tournaments/:id              | Update tournament        |
| GET    | /api/tournaments/:id/standings    | Tournament standings     |
| POST   | /api/tournaments/:id/register     | Register team            |
| GET    | /api/teams                        | List all teams           |
| POST   | /api/teams                        | Create team              |
| GET    | /api/teams/:id                    | Team details + roster    |
| POST   | /api/teams/:id/members            | Add member               |
| DELETE | /api/teams/:id/members/:userId    | Remove member            |
| GET    | /api/matches                      | List matches             |
| POST   | /api/matches                      | Schedule match           |
| PUT    | /api/matches/:id/result           | Update match result      |
| GET    | /api/dashboard                    | Dashboard statistics     |

---

## 👨‍💻 Made for DBMS Project Submission
