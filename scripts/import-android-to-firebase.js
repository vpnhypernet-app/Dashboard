// Script pour importer les données Android dans Firebase
// Usage: node scripts/import-android-to-firebase.js

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Charger les variables d'environnement
require('dotenv').config({ path: '.env.local' });

// Initialiser Firebase
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: privateKey,
  }),
  databaseURL: process.env.FIREBASE_DATABASE_URL,
});

const db = admin.database();

async function importAndroidData() {
  try {
    console.log('📖 Lecture du fichier Android...');
    const androidPath = path.join(__dirname, '..', 'data', 'hypernet-Android.json');
    const androidData = JSON.parse(fs.readFileSync(androidPath, 'utf8'));
    
    console.log('🔥 Import dans Firebase Realtime Database...');
    await db.ref('/').set(androidData);
    
    console.log('✅ Import réussi !');
    console.log(`📊 ${Object.keys(androidData.countries || {}).length} pays importés`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors de l\'import:', error);
    process.exit(1);
  }
}

importAndroidData();
