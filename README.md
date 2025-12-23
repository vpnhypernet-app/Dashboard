# 🖥️ Dashboard de Monitoring Serveurs

Un dashboard moderne et élégant pour surveiller vos serveurs MVPS et OneProvider en temps réel.

## 🚀 Fonctionnalités

- ✅ Affichage en temps réel des informations serveurs
- ✅ Surveillance de la consommation (CPU, RAM, Disk, Bandwidth)
- ✅ Affichage des prix mensuels
- ✅ Support de multiples providers (MVPS, OneProvider)
- ✅ Auto-refresh toutes les 30 secondes
- ✅ Interface moderne avec dark mode
- ✅ Design responsive (mobile, tablet, desktop)

## 📋 Prérequis

- Node.js 18+ installé
- npm ou yarn
- Clés API de vos providers (MVPS, OneProvider)

## 🔧 Installation

1. **Installer les dépendances:**

```bash
npm install
```

2. **Configurer les clés API:**

Copiez le fichier `.env.example` en `.env.local`:

```bash
cp .env.example .env.local
```

Puis éditez `.env.local` et ajoutez vos clés API:

```env
MVPS_API_KEY=votre_clé_api_mvps
ONEPROVIDER_API_KEY=votre_clé_api_oneprovider
```

3. **Lancer le serveur de développement:**

```bash
npm run dev
```

4. **Ouvrir dans le navigateur:**

Allez sur [http://localhost:3000](http://localhost:3000)

## 📁 Structure du Projet

```
monitoring/
├── app/
│   ├── api/
│   │   └── servers/
│   │       └── route.ts        # API endpoint pour récupérer les serveurs
│   ├── globals.css             # Styles globaux
│   ├── layout.tsx              # Layout principal
│   └── page.tsx                # Page d'accueil
├── components/
│   ├── Dashboard.tsx           # Composant principal du dashboard
│   └── ServerCard.tsx          # Carte d'affichage d'un serveur
├── lib/
│   └── api.ts                  # Fonctions d'appel aux APIs
├── types/
│   └── server.ts               # Types TypeScript
└── .env.local                  # Variables d'environnement (à créer)
```

## 🔌 Configuration des APIs

### Pour MVPS

Actuellement, le code utilise des données de démonstration. Pour connecter l'API réelle:

1. Ouvrez `lib/api.ts`
2. Trouvez la fonction `fetchMVPSServers()`
3. Remplacez le code mock par l'appel API réel:

```typescript
const response = await fetch('https://api.mvps.net/v1/servers', {
  headers: {
    'Authorization': `Bearer ${apiKey}`,
  },
});
const data = await response.json();
// Transformez les données selon le format Server
```

### Pour OneProvider

Même processus dans la fonction `fetchOneProviderServers()`.

## 📊 Format des Données

Chaque serveur doit avoir ce format:

```typescript
{
  id: string;
  name: string;
  ip: string;
  provider: 'mvps' | 'oneprovider';
  status: 'online' | 'offline' | 'maintenance';
  cpu: number;        // pourcentage (0-100)
  ram: number;        // pourcentage (0-100)
  disk: number;       // pourcentage (0-100)
  bandwidth: {
    used: number;     // en GB
    total: number;    // en GB
  };
  price: number;      // coût mensuel
  currency: string;   // ex: 'EUR'
  location?: string;  // optionnel
}
```

## 🎨 Personnalisation

### Changer l'intervalle de rafraîchissement

Dans `components/Dashboard.tsx`, modifiez:

```typescript
const interval = setInterval(fetchServers, 30000); // 30000 = 30 secondes
```

### Modifier les couleurs

Les couleurs sont configurées avec Tailwind CSS. Éditez `tailwind.config.ts` pour personnaliser le thème.

## 🚀 Déploiement

### En local (accessible uniquement sur votre machine)

```bash
npm run dev
```

### Pour production (accessible à d'autres)

1. **Build du projet:**

```bash
npm run build
```

2. **Lancer en mode production:**

```bash
npm start
```

3. **Déployer sur Vercel (recommandé):**

```bash
npm install -g vercel
vercel
```

Suivez les instructions. N'oubliez pas d'ajouter vos variables d'environnement dans les paramètres Vercel!

## 🔒 Sécurité

- ⚠️ Ne commitez JAMAIS le fichier `.env.local`
- ⚠️ Les clés API sont stockées côté serveur (API routes)
- ⚠️ Pour un déploiement en production, ajoutez une authentification

## 🐛 Dépannage

### Le dashboard ne charge pas les serveurs

1. Vérifiez que `.env.local` existe et contient vos clés API
2. Vérifiez la console du navigateur pour les erreurs
3. Vérifiez que le serveur dev est lancé (`npm run dev`)

### Erreur de compilation TypeScript

```bash
rm -rf .next
npm install
npm run dev
```

## 📝 TODO

- [ ] Connecter les vraies APIs MVPS et OneProvider
- [ ] Ajouter des graphiques d'historique
- [ ] Ajouter des alertes par email/SMS
- [ ] Ajouter l'authentification
- [ ] Ajouter plus de métriques

## 📄 License

MIT

---

Créé avec ❤️ pour surveiller vos serveurs
