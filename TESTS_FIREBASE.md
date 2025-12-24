# 🧪 Tests Firebase - Android

## 1. Test de lecture

```bash
# Ouvrir le terminal et lancer
curl http://localhost:3000/api/config
```

Vérifiez que vous voyez les serveurs Android.

## 2. Test de mise à jour

1. Ouvrez le Dashboard
2. Changez le statut d'un serveur Android
3. Cliquez sur "Sauvegarder"
4. Vérifiez dans la console que vous voyez : `✅ Serveur Android XXX.XXX.XXX.XXX mis à jour dans Firebase`
5. Allez dans Firebase Console → Realtime Database
6. Vérifiez que `ispremium` et `isavailable` ont bien changé

## 3. Test temps réel

1. Ouvrez Firebase Console dans un onglet
2. Modifiez manuellement une valeur dans Firebase
3. Dans le Dashboard, cliquez sur "Actualiser les données"
4. Vérifiez que le changement apparaît

## 4. Test Fallback

Pour tester que le fallback fonctionne :
1. Mettez une mauvaise URL Firebase dans .env.local
2. Redémarrez le serveur
3. Vérifiez que ça fonctionne encore (fichier local)
4. Remettez la bonne URL

## ✅ Checklist

- [ ] Config Firebase dans .env.local
- [ ] Données Android importées dans Firebase
- [ ] Lecture depuis Firebase fonctionne
- [ ] Mise à jour dans Firebase fonctionne
- [ ] App mobile Android lit depuis Firebase
- [ ] Fallback vers fichier local fonctionne
