# 🔥 Configuration Firebase Remote Config

## 📋 Vue d'ensemble

Le système Firebase Remote Config permet de :
- **Gérer les serveurs iOS et Android** (Premium/Gratuit/Non disponible)
- **Automatiser** la disponibilité basée sur la bande passante (>= 95% = non disponible)
- **Interface UI** pour modifier manuellement les configurations
- **Synchronisation en temps réel** avec vos applications mobiles

## 🚀 Configuration initiale

### 1. Créer un projet Firebase

1. Allez sur [console.firebase.google.com](https://console.firebase.google.com)
2. Cliquez sur **"Ajouter un projet"**
3. Donnez un nom à votre projet (ex: "vpn-hypernet-dashboard")
4. Activez Google Analytics (optionnel)
5. Créez le projet

### 2. Obtenir les credentials

1. Dans Firebase Console, allez dans **⚙️ Paramètres du projet**
2. Onglet **"Comptes de service"**
3. Cliquez sur **"Générer une nouvelle clé privée"**
4. Téléchargez le fichier JSON

### 3. Activer Remote Config

1. Dans Firebase Console, allez dans **Remote Config**
2. Cliquez sur **"Commencer"**
3. Créez les paramètres :
   - **Paramètre 1** : `ios_servers`
   - **Paramètre 2** : `android_servers`

### 4. Structure des données Remote Config

Format JSON pour chaque paramètre :

```json
{
  "servers": [
    {
      "id": "srv_mvps_us_01",
      "name": "VPN US New York",
      "location": "United States",
      "tier": "premium",
      "available": true,
      "provider": "mvps",
      "ip": "45.123.45.67"
    },
    {
      "id": "srv_oneprovider_fr_01",
      "name": "VPN FR Paris",
      "location": "France",
      "tier": "free",
      "available": true,
      "provider": "oneprovider",
      "ip": "89.234.56.78"
    }
  ],
  "lastUpdated": "2025-12-23T10:30:00.000Z"
}
```

### 5. Configuration des variables d'environnement

À partir du fichier JSON téléchargé, copiez les valeurs dans `.env.local` :

```env
FIREBASE_PROJECT_ID=votre-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@votre-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
Votre_Cle_Privee_Complete_Ici
-----END PRIVATE KEY-----
"
```

⚠️ **Important** : La clé privée doit garder les retours à la ligne `\n`

**Sur Vercel**, ajoutez ces variables avec les guillemets pour la PRIVATE_KEY.

## 🎮 Utilisation

### Interface Dashboard

1. **Ouvrir le Dashboard** : http://localhost:3000
2. **Cliquer sur** "⚙️ Configuration Firebase"
3. **Sélectionner la plateforme** : iOS ou Android
4. **Modifier les serveurs** :
   - Changer le tier (Premium/Gratuit/Non disponible)
   - Toggle Disponible/Indisponible
5. **Sauvegarder** : Les changements sont automatiques

### Automatisation

Le système vérifie automatiquement la bande passante lors de l'appel `/api/alerts` :

```bash
curl http://localhost:3000/api/alerts
```

**Règles d'automatisation** :
- Si bande passante **>= 95%** → Serveur marqué **"unavailable"**
- Si bande passante **< 95%** → Serveur marqué **"premium"**

### API Routes

#### GET /api/config
Récupérer la configuration complète

```bash
curl http://localhost:3000/api/config
```

Réponse :
```json
{
  "success": true,
  "config": {
    "ios": {
      "servers": [...],
      "lastUpdated": "2025-12-23T10:30:00.000Z"
    },
    "android": {
      "servers": [...],
      "lastUpdated": "2025-12-23T10:30:00.000Z"
    }
  }
}
```

#### PATCH /api/config
Mettre à jour un serveur spécifique

```bash
curl -X PATCH http://localhost:3000/api/config \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "ios",
    "serverId": "srv_mvps_us_01",
    "tier": "premium",
    "available": true
  }'
```

#### POST /api/config
Remplacer toute la configuration d'une plateforme

```bash
curl -X POST http://localhost:3000/api/config \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "ios",
    "config": {
      "servers": [...],
      "lastUpdated": "2025-12-23T10:30:00.000Z"
    }
  }'
```

## 📱 Intégration dans vos apps mobiles

### iOS (Swift)

```swift
import FirebaseRemoteConfig

let remoteConfig = RemoteConfig.remoteConfig()
remoteConfig.fetch { status, error in
    guard status == .success else { return }
    remoteConfig.activate { changed, error in
        let iosServersJSON = remoteConfig["ios_servers"].stringValue
        // Parser le JSON et utiliser les serveurs
    }
}
```

### Android (Kotlin)

```kotlin
val remoteConfig = Firebase.remoteConfig
remoteConfig.fetchAndActivate()
    .addOnCompleteListener { task ->
        if (task.isSuccessful) {
            val androidServersJSON = remoteConfig.getString("android_servers")
            // Parser le JSON et utiliser les serveurs
        }
    }
```

## 🔄 Synchronisation automatique avec Cron

Pour automatiser la mise à jour des serveurs, créez `vercel.json` :

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

Cela vérifie et met à jour Firebase toutes les 6 heures.

## 🎯 Types de serveurs (Tier)

| Tier | Description | Usage |
|------|-------------|-------|
| `premium` | ⭐ Premium | Serveurs réservés aux utilisateurs premium |
| `free` | 🆓 Gratuit | Serveurs accessibles à tous |
| `unavailable` | 🚫 Non disponible | Serveurs hors service (bande passante saturée) |

## 📊 Monitoring

L'interface Dashboard affiche en temps réel :
- **Nombre de serveurs** par plateforme
- **Répartition** : Premium / Gratuit / Non disponible
- **Statut de disponibilité** de chaque serveur
- **Dernière mise à jour** de la configuration

## ❗ Dépannage

### "Firebase credentials non configurés"
➜ Vérifiez que `FIREBASE_PROJECT_ID`, `FIREBASE_PRIVATE_KEY` et `FIREBASE_CLIENT_EMAIL` sont dans `.env.local`

### "Serveur non trouvé"
➜ Le serveur n'existe pas dans Remote Config pour cette plateforme. Ajoutez-le manuellement dans Firebase Console.

### "Permission denied"
➜ Vérifiez que le compte de service a les permissions **"Firebase Remote Config Admin"**

### Les changements ne se reflètent pas dans l'app
➜ Les apps doivent appeler `fetch()` et `activate()` pour récupérer les nouvelles valeurs

## 🔐 Sécurité

- ✅ Les credentials Firebase sont dans `.env.local` (ignoré par Git)
- ✅ Firebase Admin SDK utilise des credentials serveur (sécurisé)
- ✅ Les apps mobiles utilisent Remote Config (lecture seule)
- ✅ Seul le Dashboard peut modifier les configurations

## 🚀 Déploiement sur Vercel

1. Ajoutez les variables Firebase dans **Settings → Environment Variables**
2. Redéployez l'application
3. Testez avec : `https://votre-app.vercel.app/api/config`

---

🎉 Votre système Firebase Remote Config est maintenant prêt !
