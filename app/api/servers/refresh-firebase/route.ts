import { NextResponse } from 'next/server';
import { getIosConfigFromFirebase, getAndroidConfigFromFirebase } from '@/lib/firebase';

export const dynamic = 'force-dynamic';

async function enrichServersWithVPNConfig(servers: any[]) {
  try {
    // 🔥 Lire les configs VPN depuis Firebase
    let iosData, androidData;
    
    // iOS depuis Firebase
    try {
      iosData = await getIosConfigFromFirebase();
      console.log('✅ Config iOS chargée depuis Firebase pour enrichissement');
    } catch (error) {
      console.warn('⚠️ Erreur Firebase iOS, utilisation config vide:', error);
      iosData = { servers: [] };
    }
    
    // Android depuis Firebase
    try {
      androidData = await getAndroidConfigFromFirebase();
      console.log('✅ Config Android chargée depuis Firebase pour enrichissement');
    } catch (error) {
      console.warn('⚠️ Erreur Firebase Android, utilisation config vide:', error);
      androidData = { countries: {} };
    }
    
    // Créer des maps pour recherche rapide par IP
    const iosServersByIP = new Map();
    const androidServersByIP = new Map();
    
    // Parcourir iOS (structure: { servers: [...] })
    if (iosData.servers && Array.isArray(iosData.servers)) {
      iosData.servers.forEach((server: any) => {
        if (server.ipaddress) {
          iosServersByIP.set(server.ipaddress, {
            available: server.isavailable === 1,
            isPremium: server.ispremium === 1,
            profileType: server.profiletype,
          });
        }
      });
    }
    
    // Parcourir Android
    if (androidData.countries) {
      Object.values(androidData.countries).forEach((country: any) => {
        if (country.servers) {
          Object.values(country.servers).forEach((server: any) => {
            if (server.ipaddress) {
              androidServersByIP.set(server.ipaddress, {
                available: server.isavailable === 1,
                isPremium: server.ispremium === 1,
                profileType: server.profiletype,
              });
            }
          });
        }
      });
    }
    
    // Enrichir chaque serveur avec iOS ET Android dans la même entrée
    return servers.map((server: any) => {
      const vpnConfig: any = {};
      
      const iosConfig = iosServersByIP.get(server.ip);
      const androidConfig = androidServersByIP.get(server.ip);
      
      if (iosConfig) {
        vpnConfig.ios = iosConfig;
      }
      
      if (androidConfig) {
        vpnConfig.android = androidConfig;
      }
      
      return {
        ...server,
        vpnConfig: Object.keys(vpnConfig).length > 0 ? vpnConfig : undefined,
      };
    });
  } catch (error) {
    console.warn('Impossible d\'enrichir avec les configs VPN:', error);
    return servers;
  }
}

export async function POST(request: Request) {
  try {
    const { servers } = await request.json();
    
    if (!servers || !Array.isArray(servers)) {
      return NextResponse.json(
        { success: false, error: 'Invalid servers data' },
        { status: 400 }
      );
    }
    
    // Enrichir uniquement avec Firebase (pas d'appel API OneProvider/MVPS)
    const enrichedServers = await enrichServersWithVPNConfig(servers);
    
    return NextResponse.json({
      success: true,
      servers: enrichedServers,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in /api/servers/refresh-firebase:', error);
    return NextResponse.json(
      {
        success: false,
        servers: [],
        error: 'Failed to refresh Firebase config',
      },
      { status: 500 }
    );
  }
}
