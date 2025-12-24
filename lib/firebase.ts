import * as admin from 'firebase-admin';

// Initialiser Firebase Admin (singleton)
if (!admin.apps.length) {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: privateKey,
    }),
  });
}

export const firebaseAdmin = admin;

/**
 * Récupérer la configuration Remote Config
 */
export async function getRemoteConfig(): Promise<any> {
  try {
    const template = await admin.remoteConfig().getTemplate();
    
    // Récupérer les paramètres spécifiques
    const iosServers = template.parameters['ios_servers'];
    const androidServers = template.parameters['android_servers'];
    
    return {
      ios: iosServers ? JSON.parse(iosServers.defaultValue?.value || '{"servers": [], "lastUpdated": ""}') : { servers: [], lastUpdated: '' },
      android: androidServers ? JSON.parse(androidServers.defaultValue?.value || '{"servers": [], "lastUpdated": ""}') : { servers: [], lastUpdated: '' },
    };
  } catch (error) {
    console.error('Erreur getRemoteConfig:', error);
    throw error;
  }
}

/**
 * Mettre à jour Remote Config
 */
export async function updateRemoteConfig(platform: 'ios' | 'android', config: any): Promise<void> {
  try {
    const template = await admin.remoteConfig().getTemplate();
    
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
    
    await admin.remoteConfig().publishTemplate(template);
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
