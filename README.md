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
![Clerk](https://img.shields.io/badge/Auth-Clerk-6C47FF?style=for-the-badge&logo=clerk&logoColor=white)
![Cloudflare R2](https://img.shields.io/badge/Storage-Cloudflare_R2-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)

<br/>

<!-- STATUS BADGES -->
![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)
![Status](https://img.shields.io/badge/status-MVP-emerald?style=flat-square&color=10B981)
![Version](https://img.shields.io/badge/version-1.1.0-blue?style=flat-square)

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
| 🔐 **Auth Clerk** | Connexion sécurisée via Clerk (email, OAuth). JWT vérifié côté backend via JWKS. |
| 🌿 **Créer une tontine** | Nom, cotisation, date, mode (aléatoire / fixe / manuel), limite de membres. |
| 👥 **Gestion des membres** | Inviter par lien ou code WhatsApp. Supprimer un membre. |
| 💳 **Versements** | Enregistrement manuel + saisie en masse. Validation gérant en un clic. |
| 🔁 **Transfert de gestion** | Demande de transfert de gérance entre membres avec acceptation/refus. |
| 🎲 **Tirage au sort équitable** | Chaque membre reçoit une fois avant qu'un second tour commence. Tirage manuel possible. |
| 🔔 **Notifications in-app** | Versement validé, bénéficiaire désigné, nouveau membre, rappel retard. |
| 📊 **Résumé financier** | Total versé, total reçu, balance, détail par tontine. |
| 👤 **Profil utilisateur** | Modifier nom, téléphone. Upload photo (Cloudflare R2). Rejoindre via code. |
| 🛡️ **Admin panel** | Statistiques globales, gestion des utilisateurs et des tontines. |
| 🌍 **Landing page** | Page publique de présentation de l'app. |

---

## 🏗️ Architecture

```
kolo/
├── backend/                    # API FastAPI
│   ├── app/
│   │   ├── main.py             # Point d'entrée + CORS
│   │   ├── config.py           # Variables d'environnement (pydantic-settings)
│   │   ├── database.py         # Connexion SQLAlchemy
│   │   ├── deps.py             # get_current_user — validation JWT Clerk (JWKS)
│   │   ├── models/             # Modèles BDD
│   │   │   ├── user.py
│   │   │   ├── tontine.py
│   │   │   ├── payment.py      # Payment, Cycle, TontineMember
│   │   │   └── notification.py
│   │   ├── schemas/            # Validation Pydantic
│   │   ├── routers/            # Endpoints API
│   │   │   ├── auth.py         # (legacy OTP, non utilisé en prod)
│   │   │   ├── tontines.py
│   │   │   ├── members.py
│   │   │   ├── payments.py
│   │   │   ├── notifications.py
│   │   │   ├── users.py        # sync, profil, avatar (R2), résumé financier
│   │   │   ├── transfer.py     # Transfert de gérance
│   │   │   └── admin.py        # Admin panel (stats, users, tontines)
│   │   └── services/
│   │       ├── notifications.py
│   │       └── r2.py           # Upload avatars → Cloudflare R2
│   ├── alembic/                # Migrations BDD
│   ├── requirements.txt
│   └── Dockerfile
└── frontend/                   # App React + Vite
    └── src/
        ├── App.jsx             # Router, Clerk Provider, sync utilisateur
        ├── pages/
        │   ├── Login.jsx       # Page de connexion (Clerk SignIn)
        │   ├── Landing.jsx     # Page publique
        │   ├── Dashboard.jsx   # Vue gérant + membre
        │   ├── TontineDetail.jsx
        │   ├── Profile.jsx     # Profil + résumé financier
        │   ├── JoinPage.jsx    # Rejoindre via code
        │   └── AdminPage.jsx   # Admin panel
        ├── components/
        │   ├── SideNav.jsx
        │   ├── BottomNav.jsx
        │   ├── NotificationBell.jsx
        │   ├── InviteModal.jsx
        │   ├── DrawModal.jsx
        │   ├── AddPaymentModal.jsx
        │   ├── TontineSettingsModal.jsx
        │   ├── TransferModal.jsx
        │   ├── MemberCard.jsx
        │   ├── UserAvatar.jsx
        │   ├── AppHeader.jsx
        │   └── Toast.jsx
        └── api/
            └── client.js       # Axios + intercepteur JWT Clerk
```

---

## 🚀 Installation

### Prérequis

- Python 3.11+
- Node.js 18+
- PostgreSQL 16 (via [Postgres.app](https://postgresapp.com) sur macOS)
- Un compte [Clerk](https://clerk.com) (gratuit)

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

# Clerk — récupère ces valeurs dans ton dashboard Clerk
CLERK_JWKS_URL=https://<ton-frontend-api>.clerk.accounts.dev/.well-known/jwks.json

# Cloudflare R2 (upload d'avatars)
R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=your_r2_access_key
R2_SECRET_ACCESS_KEY=your_r2_secret_key
R2_BUCKET=kolo-avatars
R2_PUBLIC_URL=https://pub-xxxx.r2.dev

# Environnement
ENVIRONMENT=development
CORS_ORIGINS=http://localhost:5173
```

### Frontend — `frontend/.env`

```env
VITE_API_URL=http://localhost:8000
VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxx
```

> **Clerk** : crée une application sur [clerk.com](https://clerk.com), active les providers souhaités (email, Google…) et copie ta `publishable key` dans `frontend/.env`.

---

## 🌐 Déploiement

### Backend → Railway

1. Crée un projet sur [railway.app](https://railway.app)
2. Connecte ton repo GitHub
3. Ajoute un service **PostgreSQL** (Railway injecte `DATABASE_URL` automatiquement)
4. Configure toutes les variables d'environnement (voir ci-dessus)
5. La commande de démarrage est dans `railway.toml` :

```toml
[deploy]
startCommand = "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT"
```

### Frontend → Vercel

1. Importe le repo sur [vercel.com](https://vercel.com)
2. **Root Directory** : `frontend`
3. **Framework** : Vite
4. Variables d'environnement :
   - `VITE_API_URL=https://ton-app.railway.app`
   - `VITE_CLERK_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxxxxxxxxx`

---

## 📡 API — Endpoints principaux

| Méthode | Endpoint | Description |
|---|---|---|
| `POST` | `/users/sync` | Synchroniser le profil Clerk → BDD |
| `GET` | `/users/me` | Profil utilisateur connecté |
| `PUT` | `/users/me` | Mettre à jour nom / téléphone |
| `POST` | `/users/me/avatar/upload` | Uploader une photo (→ Cloudflare R2) |
| `GET` | `/users/me/summary` | Résumé financier personnel |
| `DELETE` | `/users/me` | Supprimer son compte |
| `GET` | `/tontines/my-tontines` | Toutes les tontines de l'utilisateur |
| `POST` | `/tontines/` | Créer une tontine |
| `GET` | `/tontines/{id}/dashboard` | Dashboard complet d'une tontine |
| `PUT` | `/tontines/{id}/settings` | Modifier les paramètres |
| `DELETE` | `/tontines/{id}` | Supprimer une tontine |
| `POST` | `/members/{id}/invite` | Inviter un membre |
| `POST` | `/members/join/{code}` | Rejoindre via code |
| `DELETE` | `/members/{tontine_id}/{member_id}` | Supprimer un membre |
| `POST` | `/payments/{id}/validate` | Valider un versement |
| `POST` | `/payments/tontine/{id}/add` | Ajouter un versement |
| `POST` | `/payments/tontine/{id}/add-bulk` | Saisie en masse |
| `POST` | `/payments/tontine/{id}/draw` | Tirage au sort |
| `POST` | `/payments/tontine/{id}/close-cycle` | Clôturer le cycle |
| `POST` | `/payments/tontine/{id}/remind-late` | Rappeler les retardataires |
| `POST` | `/transfer/request` | Demander un transfert de gérance |
| `POST` | `/transfer/{id}/respond` | Accepter / refuser un transfert |
| `GET` | `/transfer/my-pending` | Mes transferts en attente |
| `GET` | `/notifications/me` | Mes notifications |
| `POST` | `/notifications/me/read-all` | Marquer tout comme lu |
| `GET` | `/admin/stats` | Statistiques globales (admin) |
| `GET` | `/admin/users` | Liste des utilisateurs (admin) |
| `GET` | `/admin/tontines` | Liste des tontines (admin) |

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
| **Auth** | Clerk (JWKS / JWT) | — |
| **Storage** | Cloudflare R2 | — |
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