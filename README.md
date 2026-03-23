# 🌿 Kolo
 
### Tontine collective simplifiée
 
<br/>
 
<!-- STACK BADGES -->
![Python](https://img.shields.io/badge/Python-3.11-3776AB?style=for-the-badge&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind-3-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
 
<br/>
 
<!-- DEPLOY BADGES -->
![Railway](https://img.shields.io/badge/Backend-Railway-0B0D0E?style=for-the-badge&logo=railway&logoColor=white)
![Vercel](https://img.shields.io/badge/Frontend-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)
![Twilio](https://img.shields.io/badge/SMS-Twilio-F22F46?style=for-the-badge&logo=twilio&logoColor=white)
 
<br/>
 
<!-- STATUS BADGES -->
![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)
![Status](https://img.shields.io/badge/status-MVP-emerald?style=flat-square&color=10B981)
![Version](https://img.shields.io/badge/version-1.0.0-blue?style=flat-square)
 
<br/>
 
> **Kolo** digitalise la tontine — versements, tirage au sort équitable, notifications in-app.  
> Tout le monde voit tout, en temps réel. Conçu pour être simple même pour les moins technophiles.
 
<br/>
 
[🚀 Démo live](#) · [📖 Documentation](#installation) · [🐛 Reporter un bug](../../issues)
 
</div>
 
---
 
## ✨ Fonctionnalités
 
| Fonctionnalité | Description |
|---|---|
| 🔐 **Auth SMS OTP** | Connexion par numéro de téléphone + code SMS. Aucun mot de passe. |
| 🌿 **Créer une tontine** | Nom, cotisation, date, mode (aléatoire / fixe / manuel), limite de membres. |
| 👥 **Gestion des membres** | Inviter par formulaire, lien ou code WhatsApp. Supprimer un membre. |
| 💳 **Versements** | Enregistrement manuel + validation gérant. Statut temps réel pour tous. |
| 🎲 **Tirage au sort équitable** | Chaque membre reçoit une fois avant qu'un second tour commence. |
| 🔔 **Notifications in-app** | Versement validé, bénéficiaire désigné, nouveau membre, rappel retard. |
| 📊 **Résumé financier** | Total versé, total reçu, balance, détail par tontine. |
| 👤 **Profil utilisateur** | Modifier nom et téléphone. Rejoindre une tontine via code. |
| 🌍 **Landing page** | Page publique de présentation de l'app. |
 
---
 
## 🏗️ Architecture
 
```
kolo/
├── backend/                    # API FastAPI
│   ├── app/
│   │   ├── main.py             # Point d'entrée
│   │   ├── config.py           # Variables d'environnement
│   │   ├── database.py         # Connexion SQLAlchemy
│   │   ├── models/             # Modèles BDD
│   │   │   ├── user.py
│   │   │   ├── tontine.py
│   │   │   ├── payment.py
│   │   │   └── notification.py
│   │   ├── schemas/            # Validation Pydantic
│   │   ├── routers/            # Endpoints API
│   │   │   ├── auth.py         # OTP SMS
│   │   │   ├── tontines.py
│   │   │   ├── members.py
│   │   │   ├── payments.py
│   │   │   ├── notifications.py
│   │   │   └── users.py
│   │   └── services/
│   │       ├── sms.py          # Twilio
│   │       └── notifications.py
│   ├── alembic/                # Migrations BDD
│   ├── requirements.txt
│   └── Dockerfile
└── frontend/                   # App React
    └── src/
        ├── pages/
        │   ├── Login.jsx       # Auth OTP
        │   ├── Dashboard.jsx   # Vue gérant + membre
        │   ├── TontineDetail.jsx
        │   ├── Profile.jsx
        │   └── Landing.jsx
        ├── components/
        │   ├── InviteModal.jsx
        │   ├── DrawModal.jsx
        │   ├── AddPaymentModal.jsx
        │   └── NotificationBell.jsx
        ├── hooks/
        │   └── useAuth.js
        └── api/
            └── client.js       # Axios + intercepteurs JWT
```
 
---
 
## 🚀 Installation
 
### Prérequis
 
- Python 3.11+
- Node.js 18+
- PostgreSQL 16 (via [Postgres.app](https://postgresapp.com) sur macOS)
 
### 1. Clone le projet
 
```bash
git clone https://github.com/ton-username/kolo.git
cd kolo
```
 
### 2. Backend
 
```bash
cd backend
 
# Environnement virtuel
python3 -m venv venv
source venv/bin/activate        # Windows : venv\Scripts\activate
 
# Dépendances
pip install -r requirements.txt
 
# Variables d'environnement
cp .env.example .env
# → Remplis les variables dans .env
```
 
### 3. Base de données (PostgreSQL)
 
```bash
# Dans psql (via Postgres.app → bouton "psql")
CREATE USER kolo WITH PASSWORD 'kolo';
CREATE DATABASE kolo OWNER kolo;
\q
```
 
```bash
# Migrations
alembic revision --autogenerate -m "init"
alembic upgrade head
```
 
### 4. Lancer le backend
 
```bash
uvicorn app.main:app --reload
# → http://localhost:8000/docs
```
 
### 5. Frontend
 
```bash
cd ../frontend
npm install
npm run dev
# → http://localhost:5173
```
 
---
 
## ⚙️ Variables d'environnement
 
### Backend — `backend/.env`
 
```env
DATABASE_URL=postgresql://kolo:kolo@localhost:5432/kolo
SECRET_KEY=change-this-super-secret-key-32-chars-minimum
ACCESS_TOKEN_EXPIRE_MINUTES=10080
 
# Twilio (optionnel en dev)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+33xxxxxxxxx
 
# Environnement
ENVIRONMENT=development        # "production" pour activer Twilio
CORS_ORIGINS=http://localhost:5173
```
 
> **Mode développement** : avec `ENVIRONMENT=development`, le code OTP est toujours `123456` — aucune config Twilio nécessaire.
 
### Frontend — `frontend/.env`
 
```env
VITE_API_URL=http://localhost:8000
```
 
---
 
## 🌐 Déploiement
 
### Backend → Railway
 
1. Crée un projet sur [railway.app](https://railway.app)
2. Connecte ton repo GitHub
3. Ajoute un service **PostgreSQL** (Railway injecte `DATABASE_URL` automatiquement)
4. Configure les variables d'environnement (voir ci-dessus)
5. La commande de démarrage est dans `railway.toml` :
 
```toml
[deploy]
startCommand = "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT"
```
 
### Frontend → Vercel
 
1. Importe le repo sur [vercel.com](https://vercel.com)
2. **Root Directory** : `frontend`
3. **Framework** : Vite
4. Variable d'environnement : `VITE_API_URL=https://ton-app.railway.app`
 
---
 
## 📡 API — Endpoints principaux
 
| Méthode | Endpoint | Description |
|---|---|---|
| `POST` | `/auth/request-otp` | Envoie un code SMS |
| `POST` | `/auth/verify-otp` | Vérifie le code et retourne un JWT |
| `POST` | `/users/` | Créer un compte |
| `GET` | `/tontines/member/{id}` | Toutes les tontines d'un utilisateur |
| `POST` | `/tontines/` | Créer une tontine |
| `GET` | `/tontines/{id}/dashboard` | Dashboard complet d'une tontine |
| `POST` | `/members/{id}/invite` | Inviter un membre |
| `POST` | `/members/join/{code}` | Rejoindre via code |
| `POST` | `/payments/{id}/validate` | Valider un versement |
| `POST` | `/payments/tontine/{id}/draw` | Tirage au sort |
| `POST` | `/payments/tontine/{id}/close-cycle` | Clôturer le cycle |
| `POST` | `/payments/tontine/{id}/remind-late` | Rappeler les retardataires |
| `GET` | `/notifications/{user_id}` | Notifications d'un utilisateur |
| `GET` | `/users/{id}/summary` | Résumé financier |
 
Documentation interactive complète : `http://localhost:8000/docs`
 
---
 
## 🗺️ Roadmap
 
- [ ] Paiement automatique (Wave, Orange Money, Stripe)
- [ ] Notifications push (PWA)
- [ ] Export PDF des cycles
- [ ] Mode sombre
- [ ] Multi-devises (FCFA, GBP, USD...)
- [ ] Application mobile native (React Native)
- [ ] Statistiques avancées avec graphiques
- [ ] Chat intégré entre membres
 
---
 
## 🛠️ Stack technique
 
| Couche | Technologie | Version |
|---|---|---|
| **API** | FastAPI | 0.111 |
| **ORM** | SQLAlchemy | 2.0 |
| **Migrations** | Alembic | 1.13 |
| **BDD** | PostgreSQL | 16 |
| **Auth** | JWT (python-jose) | — |
| **SMS** | Twilio | 9.0 |
| **Frontend** | React | 18 |
| **Build** | Vite | 5 |
| **Style** | Tailwind CSS | 3 |
| **Data fetching** | TanStack Query | 5 |
| **HTTP client** | Axios | 1.7 |
| **Routing** | React Router | 6 |
| **Backend deploy** | Railway | — |
| **Frontend deploy** | Vercel | — |
 
---
 
## 📄 Licence
 
MIT © Ibrahim Abah — Fait avec ❤️ et 🌿