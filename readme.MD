# Deploy Instructions

Create a `.env` file in the root directory with a `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`

Add the `.env` file to the foodwars-app section of the docker-compose.yml file for local use.

docker build -t app .

You can also do `npm install` and `npm run dev` for development

## Tech stack

- Node.js (TypeScript)
- Express
- Socket.IO (real-time)
- PixiJS (client rendering)
- Redis (real-time game leaderboard)
- Supabase / PostgreSQL (persistent storage of user data, overall leaderboards)
- Passport (Google OAuth)
- Docker
- Tailwind CSS

## future features

- friends list
join friends' room quickly by just checking your friends list and if they're online
- better collisions
implement better backend collsiion detection system to reduce server load
- real-time leaderboard / leaderboard

rename to Kitchen Kombat