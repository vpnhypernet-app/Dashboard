# Firebase Realtime Database - Guide d'intégration

## 📋 Présentation

Firebase Realtime Database permet de mettre à jour **des valeurs spécifiques** sans avoir à réécrire toute la base de données. C'est très efficace pour notre cas d'usage.

## 🔧 Comment ça fonctionne

### Mise à jour partielle (Recommended)

Firebase permet de mettre à jour uniquement les champs nécessaires avec `update()` :

```javascript
// Mettre à jour seulement ispremium et isavailable d'un serveur iOS
const updates = {};
updates[`/countries/France/servers/lille---ikev2-4500-1/ispremium`] = 1;
updates[`/countries/France/servers/lille---ikev2-4500-1/isavailable`] = 1;

await database.ref().update(updates);
```

### Avantages
- ✅ Pas besoin de télécharger toute la DB
- ✅ Mise à jour atomique (tout ou rien)
- ✅ Très rapide
- ✅ Économise de la bande passante

## 🚀 Stratégie d'implémentation recommandée

### Option 1: Mise à jour directe (Recommandé)
Quand l'utilisateur clique sur "Sauvegarder" :
1. Envoyer les modifications à l'API
2. L'API met à jour Firebase directement avec les paths spécifiques
3. Pas besoin de fichier local intermédiaire

```javascript
// Dans /api/config/update/route.ts
import admin from 'firebase-admin';

// Pour iOS (structure: { servers: [...] })
const serverIndex = iosServers.findIndex(s => s.ipaddress === serverIp);
if (serverIndex !== -1) {
  await admin.database()
    .ref(`/servers/${serverIndex}`)
    .update({
      ispremium: isPremium ? 1 : 0,
      isavailable: isAvailable ? 1 : 0
    });
}

// Pour Android (structure: { countries: { ... } })
await admin.database()
  .ref(`/countries/${country}/servers/${serverKey}`)
  .update({
    ispremium: isPremium ? 1 : 0,
    isavailable: isAvailable ? 1 : 0
  });
```

### Option 2: Fichier local puis sync
1. Modifier le fichier JSON local
2. Parser les changements
3. Pousser uniquement les changements vers Firebase

**Moins recommandé** car plus complexe et risque de désynchronisation.

## 📝 Structure des données

### iOS (flat array)
```
/servers/[index]/
  ├── ipaddress
  ├── ispremium
  ├── isavailable
  └── ...
```

### Android (nested by country)
```
/countries/
  └── France/
      └── servers/
          └── lille---ikev2-4500-1/
              ├── ipaddress
              ├── ispremium
              ├── isavailable
              └── ...
```

## 🔐 Configuration requise

```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account-email
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_DATABASE_URL=https://your-project.firebaseio.com
```

## 🎯 Prochaines étapes

1. ✅ Actuellement : Fichiers JSON locaux
2. 🔄 Prochaine étape : Remplacer les fichiers par Firebase Realtime Database
3. 📱 Apps mobiles iOS/Android lisent directement depuis Firebase

## 💡 Recommandation

**Utilisez la mise à jour directe (Option 1)** :
- Plus simple à implémenter
- Moins de risques d'erreur
- Temps réel
- Cohérence garantie entre Dashboard et apps mobiles
