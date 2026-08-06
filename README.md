# AutoMinutes

AutoMinutes este o aplicatie full-stack pentru meeting-uri, transcripturi, rezultate AI si action items.

## Structura

- `backend` - API NestJS, MongoDB, Google OAuth/Calendar, mail si procesare AI prin Ollama.
- `frontend` - React + Vite.

## Rulare Locala

Backend:

```bash
cd backend
npm install
copy .env.example .env
npm run start:dev
```

Frontend:

```bash
cd frontend
npm install
copy .env.example .env
npm run dev
```

Implicit:

- frontend: `http://localhost:5173`
- backend: `http://localhost:3500`
- Swagger: `http://localhost:3500/api/docs`
- health check: `http://localhost:3500/health`

## Docker

Pentru o rulare portabila cu MongoDB inclus:

```bash
docker compose up --build
```

Aplicatia va fi disponibila la:

- frontend Docker: `http://localhost:8080`
- backend Docker: `http://localhost:3500`

## Variabile Backend

Configureaza `backend/.env` pornind de la `backend/.env.example`.

Variabile importante:

- `PORT` - portul API-ului.
- `HOST` - foloseste `0.0.0.0` pentru hosting in containere sau platforme cloud.
- `MONGODB_URI` - conexiunea MongoDB locala sau Atlas.
- `JWT_SECRET` - secret puternic pentru token-uri.
- `FRONTEND_URL` - URL-ul public al frontend-ului.
- `CORS_ORIGINS` - originile permise, separate prin virgula.
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` - configurare Google OAuth.
- `ENCRYPTION_KEY` - cheie hex de 64 caractere.
- `MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, `MAIL_PASS` - SMTP.
- `OLLAMA_URL`, `OLLAMA_MODEL` - configurare AI locala sau server AI.
- `AI_PROVIDER` - `auto`, `ollama` sau `fallback`.

## Variabile Frontend

Configureaza `frontend/.env` pornind de la `frontend/.env.example`.

```env
VITE_BACKEND_URL=https://api-ul-tau.example.com
```

La Vite, aceasta variabila se pune inainte de build. Pe Vercel/Netlify o adaugi in setarile proiectului.

## Deploy Pe Platforme Comune

### Netlify Pentru Frontend

Proiectul include `netlify.toml`, deci Netlify poate detecta automat:

- Base directory: `frontend`
- Build command: `npm run build`
- Publish directory: `dist`

In Netlify trebuie setata variabila:

```env
VITE_BACKEND_URL=https://backend-ul-tau
```

Fara `VITE_BACKEND_URL`, frontend-ul de productie nu va porni corect, pentru ca nu stie unde este API-ul.

Pentru refresh pe rute ca `/dashboard`, proiectul include deja `_redirects` si configurare in `netlify.toml`.

### Alte Platforme Frontend

- Build command: `npm run build`
- Output directory: `dist`
- Env: `VITE_BACKEND_URL=https://backend-ul-tau`

Backend Node:

- Build command: `npm install && npm run build`
- Start command: `npm run start:prod`
- Health check path: `/health`
- Seteaza `HOST=0.0.0.0`.
- Seteaza `PORT` conform platformei, daca platforma il injecteaza automat.

## Build Check

```bash
cd backend && npm run build
cd frontend && npm run build
```

Pentru pasii completi de publicare pe Netlify + Render + MongoDB Atlas, vezi `DEPLOYMENT.md`.
