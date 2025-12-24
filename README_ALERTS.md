# 🚨 Système d'Alertes par Email

## 📋 Vue d'ensemble

Le système d'alertes surveille automatiquement vos serveurs et vous envoie des emails lorsque :
- **Bande passante** : Atteint 75% (warning) ou 95% (critique)
- **Renouvellement** : À 7 jours ou moins de la date de renouvellement

## 🔧 Configuration

### 1. Créer un compte Resend

1. Allez sur [resend.com](https://resend.com)
2. Créez un compte gratuit (3000 emails/mois)
3. Allez dans **API Keys**
4. Créez une nouvelle clé API

### 2. Variables d'environnement

Ajoutez ces variables dans votre fichier `.env.local` :

```env
# Email Alerts - Resend
RESEND_API_KEY=re_votre_cle_resend_ici
EMAIL_TO=votre-email@example.com
EMAIL_FROM=onboarding@resend.dev
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Sur Vercel**, ajoutez ces mêmes variables dans :
- **Settings** → **Environment Variables**
- Cochez : Production, Preview, Development

### 3. Personnaliser les seuils (optionnel)

Les seuils par défaut sont dans `types/alert.ts` :

```typescript
export const DEFAULT_ALERT_CONFIG: AlertConfig = {
  bandwidthThresholds: {
    warning: 75,    // Alerte à 75%
    critical: 95,   // Alerte critique à 95%
  },
  renewalDaysThreshold: 7,  // Alerte 7 jours avant
};
```

## 🚀 Utilisation

### Vérification manuelle

Appelez l'API pour vérifier les alertes :

```bash
curl http://localhost:3000/api/alerts
```

Ou dans le navigateur :
```
http://localhost:3000/api/alerts
```

### Automatisation avec Vercel Cron Jobs

1. Créez le fichier `vercel.json` à la racine du projet :

```json
{
  "crons": [
    {
      "path": "/api/alerts",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

Planifications possibles :
- `0 */6 * * *` - Toutes les 6 heures
- `0 9 * * *` - Tous les jours à 9h
- `0 */12 * * *` - Toutes les 12 heures

2. Déployez sur Vercel
3. Les alertes seront vérifiées automatiquement

### Alternative : GitHub Actions

Créez `.github/workflows/alerts.yml` :

```yaml
name: Check Server Alerts

on:
  schedule:
    - cron: '0 */6 * * *'  # Toutes les 6 heures
  workflow_dispatch:  # Permet l'exécution manuelle

jobs:
  check-alerts:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Alert Check
        run: |
          curl -X GET https://votre-app.vercel.app/api/alerts
```

## 📧 Format des emails

Les emails contiennent :
- **En-tête** : Rouge (critique) ou Orange (warning)
- **Alertes critiques** : Bande passante ≥95% ou renouvellement ≤3 jours
- **Alertes warning** : Bande passante ≥75% ou renouvellement ≤7 jours
- **Détails** : Barres de progression, dates, pourcentages

## 🎯 Types d'alertes

### Bande passante

| Seuil | Sévérité | Exemple |
|-------|----------|---------|
| 75-94% | Warning | ⚠️ ATTENTION: Bande passante à 82.5% |
| ≥95% | Critique | 🚨 CRITIQUE: Bande passante à 96.3% |

### Renouvellement

| Jours restants | Sévérité | Exemple |
|----------------|----------|---------|
| 4-7 jours | Warning | ⚠️ Renouvellement proche: dans 5 jours |
| ≤3 jours | Critique | 🚨 URGENT: Renouvellement dans 2 jours ! |
| Dépassé | Critique | 🚨 URGENT: Date dépassée de 3 jours ! |

## 🧪 Test

Pour tester le système :

1. Démarrez le serveur local :
```bash
npm run dev
```

2. Appelez l'API :
```bash
curl http://localhost:3000/api/alerts
```

3. Vérifiez la réponse :
```json
{
  "success": true,
  "message": "2 alerte(s) envoyée(s) par email",
  "alertCount": 2,
  "alerts": [...]
}
```

4. Vérifiez votre boîte email

## ❗ Dépannage

### "EMAIL_TO non configuré"
➜ Ajoutez `EMAIL_TO=votre-email@example.com` dans `.env.local`

### "RESEND_API_KEY non configuré"
➜ Ajoutez votre clé API Resend dans `.env.local`

### Aucun email reçu
1. Vérifiez les logs de l'API
2. Vérifiez votre dossier spam
3. Vérifiez votre clé API sur [resend.com](https://resend.com)

### Erreur "Failed to fetch servers"
➜ Vérifiez que `NEXT_PUBLIC_APP_URL` est correctement configuré

## 📊 Exemple de réponse API

```json
{
  "success": true,
  "message": "3 alerte(s) envoyée(s) par email",
  "alertCount": 3,
  "alerts": [
    {
      "type": "bandwidth",
      "severity": "critical",
      "serverId": "srv_123",
      "serverName": "VPN-US-01",
      "provider": "mvps",
      "message": "⚠️ CRITIQUE: Bande passante à 96.5%",
      "details": {
        "bandwidthUsed": 965,
        "bandwidthTotal": 1000,
        "bandwidthPercent": 96.5
      },
      "timestamp": "2025-12-23T10:30:00.000Z"
    }
  ]
}
```

## 🔐 Sécurité

- Les clés API ne sont **jamais** commitées (`.env.local` est dans `.gitignore`)
- Utilisez des variables d'environnement sur Vercel
- Gardez votre clé Resend confidentielle
