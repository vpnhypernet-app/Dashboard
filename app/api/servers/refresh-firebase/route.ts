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
    
    // Créer des maps pour recherche rapide par IP (supporte doublons par IP)
    const iosServersByIP = new Map<string, any[]>();
    const androidServersByIP = new Map<string, any[]>();
    
    // Parcourir iOS (structure: { servers: [...] })
    if (iosData.servers && Array.isArray(iosData.servers)) {
      iosData.servers.forEach((server: any, index: number) => {
        if (server.ipaddress) {
          const entry = {
            available: server.isavailable === 1,
            isPremium: server.ispremium === 1,
            profileType: server.profiletype,
            refPath: `/servers/${index}`,
            id: server.id || server.order || String(index),
            order: server.order ?? index,
            name: server.city || server.ipaddress,
          };

          const list = iosServersByIP.get(server.ipaddress) || [];
          list.push(entry);
          iosServersByIP.set(server.ipaddress, list);
        }
      });
    }
    
    // Parcourir Android
    if (androidData.countries) {
      Object.entries(androidData.countries).forEach(([countryKey, country]: [string, any]) => {
        if (country.servers) {
          Object.entries(country.servers).forEach(([serverKey, server]: [string, any]) => {
            if (server.ipaddress) {
              const entry = {
                available: server.isavailable === 1,
                isPremium: server.ispremium === 1,
                profileType: server.profiletype,
                refPath: `/countries/${countryKey}/servers/${serverKey}`,
                id: server.id || serverKey,
                order: server.order,
                country: countryKey,
                name: server.city || serverKey,
              };

              const list = androidServersByIP.get(server.ipaddress) || [];
              list.push(entry);
              androidServersByIP.set(server.ipaddress, list);
            }
          });
        }
      });
    }
    
    // Enrichir chaque serveur avec iOS ET Android dans la même entrée
    return servers.map((server: any) => {
      const vpnConfig: any = {};
      
      const iosList = iosServersByIP.get(server.ip) || [];
      const androidList = androidServersByIP.get(server.ip) || [];
      
      if (iosList.length > 0) {
        vpnConfig.iosMultiple = iosList;
        vpnConfig.ios = iosList[0]; // compat pour affichage existant
      }
      
      if (androidList.length > 0) {
        vpnConfig.androidMultiple = androidList;
        vpnConfig.android = androidList[0]; // compat pour affichage existant
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
