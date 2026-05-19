# 🚀 Guide de déploiement étape par étape

## 1️⃣ Créer le projet Supabase (5 min)

1. Va sur [supabase.com](https://supabase.com), crée un compte gratuit
2. **New project** → nom `pointage-bar`, région **West EU (Paris)**, mot de passe DB (à garder)
3. Attends ~2 min que le projet soit prêt
4. Menu de gauche → **SQL Editor** → **+ New query**
5. Copie-colle le contenu de `supabase/schema.sql`, clique **Run**
6. **Settings** (⚙️) → **API** : garde cette page ouverte, tu vas avoir besoin de :
   - **Project URL** (`https://xxx.supabase.co`)
   - **anon public key** (commence par `eyJ...`)

## 2️⃣ Pousser le code sur GitHub (5 min)

```bash
unzip pointage-bar.zip
cd pointage-bar
git init
git add .
git commit -m "Initial commit: pointage bar"

# Crée le repo sur https://github.com/new (nom: pointage-bar, privé recommandé)
git branch -M main
git remote add origin https://github.com/TON_USER/pointage-bar.git
git push -u origin main
```

## 3️⃣ Déployer sur Vercel (3 min — recommandé)

1. [vercel.com](https://vercel.com) → connecte-toi avec GitHub
2. **Add New...** → **Project** → sélectionne `pointage-bar` → **Import**
3. **Environment Variables**, ajoute :
   - `NEXT_PUBLIC_SUPABASE_URL` = ton Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = ton anon public key
4. **Deploy**. URL en `https://pointage-bar-xxx.vercel.app` en 1 min

Chaque `git push main` redéploie automatiquement.

## 3️⃣bis Alternative : Netlify

1. [netlify.com](https://netlify.com) → **Add new site** → **Import from Git**
2. Sélectionne le repo
3. Ajoute les 2 variables d'environnement Supabase
4. Deploy

## 4️⃣ Tester en local (recommandé d'abord)

```bash
cd pointage-bar
npm install
cp .env.example .env.local
# Édite .env.local et colle tes valeurs Supabase
npm run dev
```

http://localhost:3000

## 5️⃣ ⚠️ Première utilisation : changer le mot de passe admin

Le mot de passe par défaut est `admin`. Première chose à faire après le déploiement :

1. Clique sur "Espace administrateur" en bas de l'accueil
2. Entre `admin` → tu es dans l'admin
3. Clique sur l'icône **🔑 Mot de passe** en haut à droite
4. Change-le pour quelque chose de sérieux

Le mot de passe est stocké dans la table `app_settings` de Supabase. Si tu l'oublies, tu peux le réinitialiser via SQL Editor :
```sql
update app_settings set value = 'admin' where key = 'admin_password';
```

## 🔧 Personnalisations

### Modifier le planning par défaut
Édite `lib/constants.ts`, constante `DEFAULT_PLANNING`.

### Salariés initiaux
Dans `supabase/schema.sql`, complète la section `insert into employees (name) values`.

### Sécurité supérieure
Pour passer à Supabase Auth (login email/password ou OAuth), il faudra modifier `lib/data.ts` et la page admin. Pour une petite équipe en confiance, le mot de passe simple en base suffit.

## 📱 Installation en tant qu'app (PWA)

L'application est une **PWA** (Progressive Web App). Une fois déployée en HTTPS, elle peut être installée comme une vraie app native, avec icône sur l'écran d'accueil, mode plein écran, et cache offline des assets.

### Sur iPad / iPhone (Safari)
1. Ouvre l'URL dans **Safari** (pas Chrome — il faut Safari sur iOS)
2. Touche le bouton **Partager** (carré avec flèche vers le haut)
3. Fait défiler et touche **Sur l'écran d'accueil**
4. Confirme le nom puis **Ajouter**

L'icône apparaît sur l'écran d'accueil. En la lançant, l'app s'ouvre en plein écran sans la barre Safari, avec respect de l'encoche/Dynamic Island.

### Sur Android (Chrome / Edge / Samsung Internet)
1. Ouvre l'URL
2. Une bannière "Installer l'application" peut apparaître automatiquement — touche-la
3. Sinon : Menu (⋮) → **Installer l'application** ou **Ajouter à l'écran d'accueil**

L'app obtient son propre icône dans le tiroir d'apps, peut être lancée depuis le multitâche, et a accès aux **raccourcis** (appui long sur l'icône) pour "Pointage du jour" et "Planning prévisionnel".

### Sur ordinateur (Chrome / Edge)
1. Une icône **+** ou **⊕** apparaît dans la barre d'adresse → clic
2. Ou menu → **Installer Pointage Bar...**

L'app obtient sa fenêtre dédiée hors du navigateur, avec sa propre icône dans le dock/barre des tâches.

### Mode offline
Le service worker met en cache les assets statiques et la coquille de l'app. Si la connexion tombe, l'interface s'affiche encore, mais les opérations Supabase (lire/sauvegarder) échoueront tant qu'il n'y a pas de réseau. Pour un vrai mode offline (avec synchro différée), il faudrait ajouter une queue IndexedDB — pas inclus pour rester simple.

## 🆘 Dépannage

| Problème | Solution |
|----------|----------|
| "Variables Supabase manquantes" | Tu as oublié `.env.local` en local ou les env vars sur Vercel |
| Erreur 401/403 Supabase | Re-exécute `schema.sql` complet (les policies RLS doivent être créées) |
| Build échoue sur Vercel | Vérifie que `package-lock.json` est commité (`git add package-lock.json`) |
| Mot de passe admin oublié | Reset via SQL Editor (voir section 5) |
| Erreur "column last_name does not exist" | Tu avais l'ancien schéma. Le nouveau contient `alter table ... if not exists` qui ajoute les colonnes. Re-exécute `schema.sql`. |
