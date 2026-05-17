# 🚀 Guide de déploiement étape par étape

## 1️⃣ Créer le projet Supabase (5 min)

1. Va sur [supabase.com](https://supabase.com) et crée un compte (gratuit)
2. Clique sur **New project**
3. Donne-lui un nom (ex: `pointage-bar`), choisis un mot de passe pour la base, et la région **West EU (Paris)**
4. Attends ~2 min que le projet soit prêt
5. Dans le menu de gauche, va dans **SQL Editor** → **+ New query**
6. Copie-colle le contenu de `supabase/schema.sql` et clique sur **Run**
7. Va dans **Settings** (⚙️) → **API** et garde cette page ouverte, tu vas avoir besoin de :
   - **Project URL** (`https://xxx.supabase.co`)
   - **anon public key** (longue clé qui commence par `eyJ...`)

## 2️⃣ Pousser le code sur GitHub (5 min)

```bash
# Décompresse l'archive
unzip pointage-bar.zip
cd pointage-bar

# Initialise git
git init
git add .
git commit -m "Initial commit: pointage bar avec Next.js + Supabase"

# Crée un repo sur https://github.com/new (nom: pointage-bar, privé recommandé)
# Puis :
git branch -M main
git remote add origin https://github.com/TON_USER/pointage-bar.git
git push -u origin main
```

## 3️⃣ Déployer sur Vercel (3 min — recommandé)

1. Va sur [vercel.com](https://vercel.com) et connecte-toi avec GitHub
2. **Add New...** → **Project**
3. Sélectionne ton repo `pointage-bar` → **Import**
4. **Environment Variables**, ajoute deux variables (copie-colle depuis Supabase) :
   - `NEXT_PUBLIC_SUPABASE_URL` = ton Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = ton anon public key
5. Clique **Deploy**
6. Au bout de ~1 minute, ton app est en ligne ! URL en `https://pointage-bar-xxx.vercel.app`

À chaque `git push` sur main, Vercel redéploie automatiquement.

## 3️⃣bis Alternative : Netlify

Vu ton historique avec Netlify, tu peux aussi :

1. [netlify.com](https://netlify.com) → **Add new site** → **Import from Git**
2. Sélectionne ton repo
3. Build command : `npm run build` (auto-détecté)
4. Publish directory : `.next` (auto-détecté)
5. **Add environment variables** : les deux variables Supabase ci-dessus
6. Deploy

## 4️⃣ Tester en local d'abord (recommandé)

```bash
cd pointage-bar

# Installe les deps
npm install

# Crée le fichier de config
cp .env.example .env.local
# Édite .env.local et colle tes deux valeurs Supabase

# Lance
npm run dev
```

Ouvre http://localhost:3000

## 🔧 Personnalisations rapides

### Changer le mot de passe admin
Dans `lib/constants.ts`, ligne `ADMIN_PASSWORD = 'admin'`. Pour un vrai prod, utilise Supabase Auth.

### Modifier le planning par défaut
Dans `lib/constants.ts`, modifie `DEFAULT_PLANNING`.

### Ajouter des salariés par défaut
Dans `supabase/schema.sql`, complète la section `insert into employees`.

## 📱 Mode tablette pour le bar

Une fois déployé, ajoute l'URL en favori sur la tablette du bar. Sur iPad : Safari → **Partager** → **Sur l'écran d'accueil**, ça crée un raccourci qui s'ouvre en plein écran comme une app native.

## 🆘 Dépannage

**Erreur "Variables Supabase manquantes"** : tu as oublié de créer `.env.local` ou les variables sur Vercel/Netlify.

**Erreur Supabase 401/403** : vérifie que le SQL a bien été exécuté (les policies RLS doivent être créées). Re-fais un `Run` du schema.sql complet.

**Build échoue sur Vercel** : check les variables d'environnement, et que tu as bien commit le `package-lock.json` (`git add package-lock.json && git commit -m "lock"`).
