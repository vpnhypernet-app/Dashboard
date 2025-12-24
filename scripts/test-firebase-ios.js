// Test de lecture Firebase iOS
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Charger les variables d'environnement manuellement
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  
  lines.forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
      
      // Enlever les guillemets si présents
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }
      
      process.env[key] = value;
    }
  });
}

loadEnv();

async function testFirebaseIOS() {
  try {
    console.log('🔍 Test de connexion Firebase iOS...\n');
    
    // Vérifier les variables d'environnement
    console.log('📋 Variables d\'environnement:');
    console.log('FIREBASE_IOS_PROJECT_ID:', process.env.FIREBASE_IOS_PROJECT_ID);
    console.log('FIREBASE_IOS_DATABASE_URL:', process.env.FIREBASE_IOS_DATABASE_URL);
    console.log('FIREBASE_IOS_CLIENT_EMAIL:', process.env.FIREBASE_IOS_CLIENT_EMAIL);
    console.log('FIREBASE_IOS_PRIVATE_KEY présente:', !!process.env.FIREBASE_IOS_PRIVATE_KEY);
    console.log('');
    
    // Initialiser Firebase pour iOS
    const privateKey = process.env.FIREBASE_IOS_PRIVATE_KEY?.replace(/\\n/g, '\n');
    
    const iosApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_IOS_PROJECT_ID,
        clientEmail: process.env.FIREBASE_IOS_CLIENT_EMAIL,
        privateKey: privateKey,
      }),
      databaseURL: process.env.FIREBASE_IOS_DATABASE_URL,
    }, 'ios-test');
    
    console.log('✅ Firebase iOS initialisé avec succès\n');
    
    // Lire la base de données
    console.log('📖 Lecture de la Realtime Database iOS...');
    const iosDB = admin.database(iosApp);
    const snapshot = await iosDB.ref('/').once('value');
    const data = snapshot.val();
    
    if (data) {
      console.log('✅ Données iOS lues avec succès!\n');
      console.log('📊 Structure des données:');
      
      if (data.servers && Array.isArray(data.servers)) {
        console.log(`   - Nombre de serveurs: ${data.servers.length}`);
        console.log(`   - Premier serveur (exemple):`);
        console.log(JSON.stringify(data.servers[0], null, 2));
      } else {
        console.log('   Structure complète:');
        console.log(JSON.stringify(data, null, 2).substring(0, 500) + '...');
      }
    } else {
      console.log('⚠️ Aucune donnée trouvée dans Firebase iOS');
    }
    
    console.log('\n✅ Test terminé avec succès!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message);
    console.error('\nDétails de l\'erreur:');
    console.error(error);
    process.exit(1);
  }
}

testFirebaseIOS();
