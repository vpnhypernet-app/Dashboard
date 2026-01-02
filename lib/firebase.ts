import * as admin from 'firebase-admin';

// Helper pour récupérer une variable avec fallback (utile pour Vercel qui expose FIREBASE_* sans suffixe)
const envWithFallback = (preferred?: string, fallback?: string) => preferred || fallback;

// Initialiser Firebase Admin pour Dashboard (notes)
let dashboardApp: any = null;
if (!admin.apps.some(app => app?.name === 'dashboard')) {
  const dashboardPrivateKey = envWithFallback(
    process.env.FIREBASE_DASHBOARD_PRIVATE_KEY,
    process.env.FIREBASE_PRIVATE_KEY,
  )?.replace(/\\n/g, '\n');

  const dashboardProjectId = envWithFallback(
    process.env.FIREBASE_DASHBOARD_PROJECT_ID,
    process.env.FIREBASE_PROJECT_ID,
  );

  const dashboardClientEmail = envWithFallback(
    process.env.FIREBASE_DASHBOARD_CLIENT_EMAIL,
    process.env.FIREBASE_CLIENT_EMAIL,
  );

  const dashboardDatabaseUrl = envWithFallback(
    process.env.FIREBASE_DASHBOARD_DATABASE_URL,
    process.env.FIREBASE_DATABASE_URL,
  );

  dashboardApp = admin.initializeApp({
    credential: admin.credential.cert({
      projectId: dashboardProjectId,
      clientEmail: dashboardClientEmail,
      privateKey: dashboardPrivateKey,
    }),
    databaseURL: dashboardDatabaseUrl,
  }, 'dashboard');
}

// Initialiser Firebase Admin pour iOS/Android (Remote Config)
let iosAndroidApp: any = null;
if (!admin.apps.some(app => app?.name === 'ios-android')) {
  const remoteConfigProjectId = envWithFallback(
    process.env.FIREBASE_IOS_PROJECT_ID,
    envWithFallback(process.env.FIREBASE_ANDROID_PROJECT_ID, process.env.FIREBASE_PROJECT_ID),
  );

  const remoteConfigClientEmail = envWithFallback(
    process.env.FIREBASE_IOS_CLIENT_EMAIL,
    envWithFallback(process.env.FIREBASE_ANDROID_CLIENT_EMAIL, process.env.FIREBASE_CLIENT_EMAIL),
  );

  const remoteConfigPrivateKey = envWithFallback(
    process.env.FIREBASE_IOS_PRIVATE_KEY,
    envWithFallback(process.env.FIREBASE_ANDROID_PRIVATE_KEY, process.env.FIREBASE_PRIVATE_KEY),
  )?.replace(/\\n/g, '\n');

  // Remote Config est optionnel : on initialise seulement si toutes les variables sont présentes
  if (remoteConfigProjectId && remoteConfigClientEmail && remoteConfigPrivateKey) {
    iosAndroidApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: remoteConfigProjectId,
        clientEmail: remoteConfigClientEmail,
        privateKey: remoteConfigPrivateKey,
      }),
    }, 'ios-android');
  } else {
    console.warn('⚠️ Variables Remote Config (FIREBASE_IOS_* ou FIREBASE_ANDROID_*/FIREBASE_*) manquantes - Remote Config désactivé');
  }
}

// Initialiser Firebase Admin pour Android Realtime Database
let androidApp: any = null;
if (!admin.apps.some(app => app?.name === 'android')) {
  const androidPrivateKey = envWithFallback(
    process.env.FIREBASE_ANDROID_PRIVATE_KEY,
    process.env.FIREBASE_PRIVATE_KEY,
  )?.replace(/\\n/g, '\n');
  
  const androidProjectId = envWithFallback(
    process.env.FIREBASE_ANDROID_PROJECT_ID,
    process.env.FIREBASE_PROJECT_ID,
  );

  const androidClientEmail = envWithFallback(
    process.env.FIREBASE_ANDROID_CLIENT_EMAIL,
    process.env.FIREBASE_CLIENT_EMAIL,
  );

  const androidDatabaseUrl = envWithFallback(
    process.env.FIREBASE_ANDROID_DATABASE_URL,
    process.env.FIREBASE_DATABASE_URL,
  );
  
  androidApp = admin.initializeApp({
    credential: admin.credential.cert({
      projectId: androidProjectId,
      clientEmail: androidClientEmail,
      privateKey: androidPrivateKey,
    }),
    databaseURL: androidDatabaseUrl,
  }, 'android');
}

export const firebaseAdmin = admin;
export const realtimeDB = dashboardApp?.database() || admin.app('dashboard').database();
export const iosAndroidAdmin = iosAndroidApp || (admin.apps.some(app => app?.name === 'ios-android') ? admin.app('ios-android') : null);
export const androidDB = androidApp?.database() || admin.app('android').database();

/**
 * Récupérer la configuration Remote Config (iOS/Android)
 */
export async function getRemoteConfig(): Promise<any> {
  try {
    if (!iosAndroidAdmin) {
      throw new Error('Remote Config iOS/Android non configuré (variables FIREBASE_IOS_* ou FIREBASE_ANDROID_*/FIREBASE_* manquantes)');
    }

    const remoteConfig = iosAndroidAdmin.remoteConfig();
    const template = await remoteConfig.getTemplate();
    
    // Récupérer les paramètres spécifiques
    const iosServers = template.parameters['ios_servers'];
    const androidServers = template.parameters['android_servers'];
    
    const iosValue = (iosServers?.defaultValue as any)?.value as string | undefined;
    const androidValue = (androidServers?.defaultValue as any)?.value as string | undefined;
    
    return {
      ios: iosValue ? JSON.parse(iosValue) : { servers: [], lastUpdated: '' },
      android: androidValue ? JSON.parse(androidValue) : { servers: [], lastUpdated: '' },
    };
  } catch (error) {
    console.error('Erreur getRemoteConfig:', error);
    throw error;
  }
}

/**
 * Mettre à jour Remote Config (iOS/Android)
 */
export async function updateRemoteConfig(platform: 'ios' | 'android', config: any): Promise<void> {
  try {
    if (!iosAndroidAdmin) {
      throw new Error('Remote Config iOS/Android non configuré (variables FIREBASE_IOS_* ou FIREBASE_ANDROID_*/FIREBASE_* manquantes)');
    }

    const remoteConfig = iosAndroidAdmin.remoteConfig();
    const template = await remoteConfig.getTemplate();
    
    const parameterKey = `${platform}_servers`;
    const configWithTimestamp = {
      ...config,
      lastUpdated: new Date().toISOString(),
    };
    
    template.parameters[parameterKey] = {
      defaultValue: {
        value: JSON.stringify(configWithTimestamp),
      },
      description: `Configuration des serveurs ${platform.toUpperCase()}`,
    };
    
    await remoteConfig.publishTemplate(template);
    console.log(`Remote Config mis à jour pour ${platform}`);
  } catch (error) {
    console.error('Erreur updateRemoteConfig:', error);
    throw error;
  }
}

/**
 * Mettre à jour un serveur spécifique
 */
export async function updateServerInRemoteConfig(
  platform: 'ios' | 'android',
  serverId: string,
  updates: { tier?: string; available?: boolean }
): Promise<void> {
  try {
    const config = await getRemoteConfig();
    const platformConfig = config[platform];
    
    if (!platformConfig || !platformConfig.servers) {
      throw new Error(`Configuration ${platform} introuvable`);
    }
    
    const serverIndex = platformConfig.servers.findIndex((s: any) => s.id === serverId);
    
    if (serverIndex === -1) {
      throw new Error(`Serveur ${serverId} introuvable dans ${platform}`);
    }
    
    // Mettre à jour le serveur
    platformConfig.servers[serverIndex] = {
      ...platformConfig.servers[serverIndex],
      ...updates,
    };
    
    // Publier la mise à jour
    await updateRemoteConfig(platform, platformConfig);
  } catch (error) {
    console.error('Erreur updateServerInRemoteConfig:', error);
    throw error;
  }
}

/**
 * Marquer un serveur comme non disponible (automatisation)
 */
export async function markServerUnavailable(serverId: string, serverName: string): Promise<void> {
  try {
    console.log(`Marquage du serveur ${serverName} (${serverId}) comme non disponible`);
    
    // Mettre à jour pour iOS et Android
    const platforms: ('ios' | 'android')[] = ['ios', 'android'];
    
    for (const platform of platforms) {
      try {
        await updateServerInRemoteConfig(platform, serverId, {
          available: false,
          tier: 'unavailable',
        });
      } catch (error) {
        console.warn(`Serveur ${serverId} non trouvé sur ${platform}, ignorer`);
      }
    }
  } catch (error) {
    console.error('Erreur markServerUnavailable:', error);
    throw error;
  }
}

/**
 * Remettre un serveur en premium (automatisation)
 */
export async function markServerPremium(serverId: string, serverName: string): Promise<void> {
  try {
    console.log(`Marquage du serveur ${serverName} (${serverId}) comme premium`);
    
    // Mettre à jour pour iOS et Android
    const platforms: ('ios' | 'android')[] = ['ios', 'android'];
    
    for (const platform of platforms) {
      try {
        await updateServerInRemoteConfig(platform, serverId, {
          available: true,
          tier: 'premium',
        });
      } catch (error) {
        console.warn(`Serveur ${serverId} non trouvé sur ${platform}, ignorer`);
      }
    }
  } catch (error) {
    console.error('Erreur markServerPremium:', error);
    throw error;
  }
}

/**
 * Lire la configuration Android depuis Firebase Realtime Database
 */
export async function getAndroidConfigFromFirebase(): Promise<any> {
  try {
    const snapshot = await androidDB.ref('/').once('value');
    return snapshot.val();
  } catch (error) {
    console.error('Erreur lecture Android Firebase:', error);
    throw error;
  }
}

/**
 * Lire la configuration iOS depuis Firebase Realtime Database
 * Note: Nécessite un projet Firebase séparé configuré avec FIREBASE_IOS_*
 */
export async function getIosConfigFromFirebase(): Promise<any> {
  try {
    // Pour iOS, on utilise un projet Firebase séparé
    // Les variables d'environnement doivent être préfixées par FIREBASE_IOS_
    const iosProjectId = process.env.FIREBASE_IOS_PROJECT_ID;
    const iosDatabaseUrl = process.env.FIREBASE_IOS_DATABASE_URL;
    
    if (!iosProjectId || !iosDatabaseUrl) {
      throw new Error('Configuration Firebase iOS manquante');
    }
    
    // Initialiser une app Firebase séparée pour iOS si elle n'existe pas
    let iosApp = admin.apps.find(app => app?.name === 'ios');
    
    if (!iosApp) {
      const privateKey = process.env.FIREBASE_IOS_PRIVATE_KEY?.replace(/\\n/g, '\n');
      
      iosApp = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: iosProjectId,
          clientEmail: process.env.FIREBASE_IOS_CLIENT_EMAIL,
          privateKey: privateKey,
        }),
        databaseURL: iosDatabaseUrl,
      }, 'ios');
    }
    
    const iosDB = admin.database(iosApp);
    
    console.log('🔍 Tentative de lecture Firebase iOS...');
    console.log('📍 Database URL:', iosDatabaseUrl);
    console.log('🔑 Project ID:', iosProjectId);
    
    // Lire depuis /servers (structure: { servers: [...] })
    const snapshot = await iosDB.ref('/servers').once('value');
    const servers = snapshot.val();
    
    console.log('✅ Données iOS récupérées:', servers ? 'Oui' : 'Non (vide)');
    if (servers) {
      console.log('📊 Type:', Array.isArray(servers) ? 'Array' : 'Object');
      console.log('📊 Nombre de serveurs:', Array.isArray(servers) ? servers.length : Object.keys(servers).length);
    }
    
    // Retourner dans le format attendu { servers: [...] }
    return { servers };
  } catch (error: any) {
    console.error('❌ Erreur lecture iOS Firebase:', error);
    console.error('Détails:', error?.message || 'Unknown error');
    throw error;
  }
}

/**
 * Mettre à jour un serveur Android dans Firebase Realtime Database
 */
export async function updateAndroidServerInFirebase(
  serverIp: string, 
  isPremium: boolean, 
  isAvailable: boolean,
  refPath?: string,
): Promise<boolean> {
  try {
    // Si on a un chemin précis (doublons), l'utiliser directement
    if (refPath) {
      await androidDB.ref(refPath).update({
        ispremium: isPremium ? 1 : 0,
        isavailable: isAvailable ? 1 : 0
      });
      console.log(`✅ Serveur Android ${serverIp} mis à jour via refPath ${refPath}`);
      return true;
    }

    // Lire toute la structure pour trouver le serveur
    const snapshot = await androidDB.ref('/countries').once('value');
    const countries = snapshot.val();
    
    if (!countries) {
      throw new Error('Aucune donnée trouvée dans Firebase');
    }
    
    // Chercher le serveur par IP
    for (const [countryKey, country] of Object.entries(countries) as any[]) {
      if (country.servers) {
        for (const [serverKey, server] of Object.entries(country.servers) as any[]) {
          if (server.ipaddress === serverIp) {
            // Serveur trouvé - mettre à jour seulement les champs nécessaires
            await androidDB
              .ref(`/countries/${countryKey}/servers/${serverKey}`)
              .update({
                ispremium: isPremium ? 1 : 0,
                isavailable: isAvailable ? 1 : 0
              });
            
            console.log(`✅ Serveur Android ${serverIp} mis à jour dans Firebase`);
            return true;
          }
        }
      }
    }
    
    console.warn(`⚠️ Serveur Android ${serverIp} non trouvé dans Firebase`);
    return false;
  } catch (error) {
    console.error('Erreur mise à jour Android Firebase:', error);
    throw error;
  }
}

/**
 * Mettre à jour un serveur iOS dans Firebase Realtime Database
 * Note: Nécessite un projet Firebase séparé configuré avec FIREBASE_IOS_*
 */
export async function updateIosServerInFirebase(
  serverIp: string, 
  isPremium: boolean, 
  isAvailable: boolean,
  refPath?: string,
): Promise<boolean> {
  try {
    const iosProjectId = process.env.FIREBASE_IOS_PROJECT_ID;
    const iosDatabaseUrl = process.env.FIREBASE_IOS_DATABASE_URL;
    
    if (!iosProjectId || !iosDatabaseUrl) {
      throw new Error('Configuration Firebase iOS manquante');
    }
    
    // Récupérer l'app iOS
    let iosApp = admin.apps.find(app => app?.name === 'ios');
    
    if (!iosApp) {
      const privateKey = process.env.FIREBASE_IOS_PRIVATE_KEY?.replace(/\\n/g, '\n');
      
      iosApp = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: iosProjectId,
          clientEmail: process.env.FIREBASE_IOS_CLIENT_EMAIL,
          privateKey: privateKey,
        }),
        databaseURL: iosDatabaseUrl,
      }, 'ios');
    }
    
    const iosDB = admin.database(iosApp);
    
    // iOS utilise une structure de tableau dans /servers
    const snapshot = await iosDB.ref('/servers').once('value');
    const servers = snapshot.val();
    
    if (!Array.isArray(servers)) {
      throw new Error('Structure iOS invalide dans Firebase - attendu un tableau dans /servers');
    }
    
    // Trouver le serveur par IP ou par refPath (doublons)
    let serverIndex = -1;
    if (refPath && refPath.startsWith('/servers/')) {
      const idxStr = refPath.replace('/servers/', '');
      const idx = parseInt(idxStr, 10);
      if (!Number.isNaN(idx) && servers[idx]) {
        serverIndex = idx;
      }
    }

    if (serverIndex === -1) {
      serverIndex = servers.findIndex((s: any) => s.ipaddress === serverIp);
    }
    
    if (serverIndex === -1) {
      console.warn(`⚠️ Serveur iOS ${serverIp} non trouvé dans Firebase`);
      return false;
    }
    
    // Mettre à jour seulement les champs nécessaires dans /servers/[index]
    await iosDB.ref(`/servers/${serverIndex}`).update({
      ispremium: isPremium ? 1 : 0,
      isavailable: isAvailable ? 1 : 0
    });
    
    console.log(`✅ Serveur iOS ${serverIp} mis à jour dans Firebase`);
    return true;
  } catch (error) {
    console.error('Erreur mise à jour iOS Firebase:', error);
    throw error;
  }
}
