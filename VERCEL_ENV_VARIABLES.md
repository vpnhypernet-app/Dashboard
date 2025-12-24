# Variables d'environnement pour Vercel

## 📋 Récapitulatif de toutes les variables à configurer

### 🔑 API Keys
```bash
# MVPS API
MVPS_API_KEY=votre_clé_api_mvps

# OneProvider API  
ONEPROVIDER_API_KEY=votre_clé_api_oneprovider

# Resend (Email)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxx
```

### 📧 Email Configuration
```bash
# Email pour recevoir les alertes
ALERT_EMAIL=votre-email@example.com
```

### 🔥 Firebase - Android (vpn-hypernet-android)
```bash
# Project ID
FIREBASE_PROJECT_ID=vpn-hypernet-android

# Private Key (clé RSA complète avec \n remplacés par \\n)
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIB...votre_clé...==\n-----END PRIVATE KEY-----\n"

# Client Email
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@vpn-hypernet-android.iam.gserviceaccount.com

# Database URL
FIREBASE_DATABASE_URL=https://vpn-hypernet-android-default-rtdb.europe-west1.firebasedatabase.app/
```

### 🍎 Firebase - iOS (projet séparé, à configurer plus tard)
```bash
# Project ID iOS
FIREBASE_IOS_PROJECT_ID=vpn-hypernet-ios

# Private Key iOS
FIREBASE_IOS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIB...votre_clé_ios...==\n-----END PRIVATE KEY-----\n"

# Client Email iOS
FIREBASE_IOS_CLIENT_EMAIL=firebase-adminsdk-xxxxx@vpn-hypernet-ios.iam.gserviceaccount.com

# Database URL iOS
FIREBASE_IOS_DATABASE_URL=https://vpn-hypernet-ios-default-rtdb.europe-west1.firebasedatabase.app/
```

---

## 📝 Instructions pour configurer dans Vercel

### Méthode 1 : Via l'interface web Vercel

1. Aller sur https://vercel.com/dashboard
2. Sélectionner votre projet **Dashboard**
3. Aller dans **Settings** → **Environment Variables**
4. Ajouter chaque variable une par une :
   - **Name**: Nom de la variable (ex: `MVPS_API_KEY`)
   - **Value**: Valeur de la variable
   - **Environment**: Cocher **Production**, **Preview**, **Development**
5. Cliquer sur **Save**

### Méthode 2 : Via Vercel CLI

```bash
# Installer Vercel CLI si pas déjà fait
npm i -g vercel

# Login
vercel login

# Depuis le dossier du projet
cd /Volumes/T7/Repository/Monitoring

# Ajouter les variables (une par une)
vercel env add MVPS_API_KEY production
vercel env add ONEPROVIDER_API_KEY production
vercel env add RESEND_API_KEY production
vercel env add ALERT_EMAIL production
vercel env add FIREBASE_PROJECT_ID production
# ... etc pour toutes les variables
```

---

## ⚠️ Notes importantes

### Pour FIREBASE_PRIVATE_KEY
La clé privée doit être formatée correctement dans Vercel :
- Remplacer tous les retours à la ligne réels `\n` par le littéral `\\n`
- Encadrer toute la clé avec des guillemets doubles
- Exemple :
  ```
  "-----BEGIN PRIVATE KEY-----\\nMIIEvQIBADANBgkqhk...\\n-----END PRIVATE KEY-----\\n"
  ```

### Firebase iOS (optionnel pour l'instant)
Les variables `FIREBASE_IOS_*` ne sont **PAS obligatoires** au démarrage.
Le système a un fallback vers les fichiers JSON locaux pour iOS.
Vous pourrez les ajouter plus tard quand vous aurez le projet Firebase iOS.

### Vérifier les variables après déploiement
```bash
# Lister toutes les variables configurées
vercel env ls

# Tester le build en local avec les variables Vercel
vercel dev
```

---

## 🚀 Déploiement

Une fois toutes les variables configurées :

```bash
# Build local pour tester
npm run build

# Déployer sur Vercel
vercel --prod

# Ou via Git (push sur main)
git push origin main
```

Vercel déploiera automatiquement à chaque push sur la branche `main`.

---

## 📊 Variables actuellement configurées localement

Fichier `.env.local` actuel (à NE PAS commiter) :
- ✅ FIREBASE_PROJECT_ID
- ✅ FIREBASE_PRIVATE_KEY
- ✅ FIREBASE_CLIENT_EMAIL
- ✅ FIREBASE_DATABASE_URL
- ⚠️ MVPS_API_KEY (à ajouter)
- ⚠️ ONEPROVIDER_API_KEY (à ajouter)
- ⚠️ RESEND_API_KEY (à ajouter)
- ⚠️ ALERT_EMAIL (à ajouter)
- ⏳ FIREBASE_IOS_* (optionnel, pour plus tard)
