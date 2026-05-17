# Pointage Bar — Gestion des heures supplémentaires

Application Next.js + Supabase pour gérer le pointage des salariés du bar et calculer automatiquement les heures supplémentaires selon la convention collective HCR.

## Fonctionnalités

- **Pointage individuel** : chaque salarié pointe son arrivée et son départ
- **Pointage groupé** : bouton "Tous arrivent / Tous partent" pour les présents du jour
- **Planning prévisionnel** : définir à l'avance qui travaille chaque jour
- **Calcul HCR** : heures normales (≤35h), +10% (36-39h), +20% (40-43h), +50% (44h+)
- **Gestion congés/absences** : congé = 7h comptées, absence = non comptée
- **Export CSV** sur une plage de semaines
- **Espace admin** protégé par mot de passe

Semaine du **mardi au dimanche** (bar fermé le lundi).

## Stack

- Next.js 16 (App Router) + React 19
- Supabase (PostgreSQL + Row Level Security)
- Tailwind CSS
- TypeScript
- Déploiement Vercel (recommandé) ou Netlify

## Installation locale

```bash
# 1. Cloner et installer
git clone https://github.com/TON_USER/pointage-bar.git
cd pointage-bar
npm install

# 2. Créer un projet Supabase sur https://supabase.com
# Récupérer l'URL et la clé anon dans Settings > API

# 3. Créer le fichier .env.local
cp .env.example .env.local
# Et remplir avec tes valeurs

# 4. Exécuter le schéma SQL dans Supabase
# Aller dans SQL Editor de Supabase, copier-coller le contenu de
# supabase/schema.sql puis exécuter

# 5. Lancer en dev
npm run dev
```

Ouvre [http://localhost:3000](http://localhost:3000).

## Configuration Supabase

1. Crée un projet sur [supabase.com](https://supabase.com) (gratuit)
2. Dans **Settings > API**, copie :
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public key` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Dans **SQL Editor**, exécute le contenu de `supabase/schema.sql`

Ce script crée trois tables (`employees`, `time_entries`, `planning`) avec leurs index et les politiques RLS qui autorisent toutes les opérations depuis le client anon (suffisant pour une équipe restreinte). Pour un usage plus sensible, mets en place une auth Supabase et restreint les policies.

## Déploiement sur Vercel (recommandé)

1. Pousse ce repo sur GitHub
2. Va sur [vercel.com](https://vercel.com), connecte ton GitHub
3. Import le projet `pointage-bar`
4. Dans les **Environment Variables**, ajoute :
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Deploy. URL en `https://pointage-bar-xxx.vercel.app`

## Déploiement sur Netlify

Le fichier `netlify.toml` est déjà configuré.

1. Push sur GitHub
2. Sur [netlify.com](https://netlify.com), New site → Import from GitHub
3. Build command : `npm run build` (auto-détecté)
4. Ajoute les variables d'env Supabase dans Site settings → Environment variables

## Personnaliser

Le planning par défaut est dans `lib/constants.ts`, et le mot de passe admin dans `components/AdminView.tsx` (cherche `'admin'`). Pour un vrai prod, utilise Supabase Auth.

## Licence

MIT
