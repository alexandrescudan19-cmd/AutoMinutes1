# Deployment AutoMinutes

Recomandat:

1. MongoDB Atlas pentru baza de date.
2. Render pentru backend.
3. Netlify pentru frontend.

## 1. MongoDB Atlas

Creeaza un cluster gratuit si copiaza connection string-ul.

Exemplu:

```env
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/autominutes?retryWrites=true&w=majority
```

In Atlas, la Network Access, permite IP-urile platformei de hosting. Pentru test rapid poti folosi `0.0.0.0/0`, apoi restrangi accesul.

## 2. Backend Pe Render

Render poate folosi `render.yaml` din repo.

Setari manuale, daca nu folosesti blueprint:

- Root directory: `backend`
- Build command: `npm ci && npm run build`
- Start command: `npm run start:prod`
- Health check path: `/health`

Variabile obligatorii:

```env
NODE_ENV=production
HOST=0.0.0.0
MONGODB_URI=mongodb+srv://...
JWT_SECRET=un-secret-lung
ENCRYPTION_KEY=64-caractere-hex
FRONTEND_URL=https://site-ul-tau.netlify.app
CORS_ORIGINS=https://site-ul-tau.netlify.app
```

Genereaza `ENCRYPTION_KEY` local:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Variabile optionale:

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=https://backend-ul-tau.onrender.com/auth/google/callback
MAIL_HOST=
MAIL_PORT=587
MAIL_SECURE=false
MAIL_USER=
MAIL_PASS=
MAIL_FROM=AutoMinutes <no-reply@domeniul-tau.ro>
OLLAMA_URL=
OLLAMA_MODEL=llama3.2:latest
AI_PROVIDER=auto
```

Fara Google configurat, login-ul normal merge, iar rutele Google returneaza mesaj de configurare.

Fara SMTP configurat, backend-ul porneste si logheaza linkurile de verificare/resetare in consola serverului.

Fara Ollama configurat, `AI_PROVIDER=auto` foloseste procesorul fallback inclus, astfel incat upload-ul de transcript si action items sa ramana functionale. Pentru AI real cu Ollama, seteaza `OLLAMA_URL` catre un server Ollama accesibil din backend.

## 3. Frontend Pe Netlify

Repo-ul are `netlify.toml`, deci Netlify detecteaza:

- Base directory: `frontend`
- Build command: `npm run build`
- Publish directory: `dist`

Variabila obligatorie:

```env
VITE_BACKEND_URL=https://backend-ul-tau.onrender.com
```

Dupa deploy-ul frontend, copiaza URL-ul Netlify inapoi in Render:

```env
FRONTEND_URL=https://site-ul-tau.netlify.app
CORS_ORIGINS=https://site-ul-tau.netlify.app
```

Apoi redeploy la backend.

## Test Dupa Deploy

Verifica:

- `https://backend-ul-tau.onrender.com/health`
- `https://site-ul-tau.netlify.app/login`
- register/login cu email si parola
- refresh pe `/dashboard`
- requests in browser DevTools sa mearga catre `VITE_BACKEND_URL`, nu catre `localhost`
