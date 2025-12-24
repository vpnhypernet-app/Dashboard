import { NextResponse } from 'next/server';
import { fetchAllServers } from '@/lib/api';
import { getIosConfigFromFirebase, getAndroidConfigFromFirebase } from '@/lib/firebase';
import path from 'path';
import { promises as fs } from 'fs';

export const dynamic = 'force-dynamic';
export const maxDuration = 30; // 30 seconds max

async function enrichServersWithVPNConfig(servers: any[]) {
  try {
    // 🔥 Lire les configs VPN depuis Firebase avec timeout
    let iosData, androidData;
    
    // iOS depuis Firebase avec timeout de 5 secondes
    try {
      const iosPromise = getIosConfigFromFirebase();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Firebase iOS timeout')), 5000)
      );
      iosData = await Promise.race([iosPromise, timeoutPromise]);
      console.log('✅ Config iOS chargée depuis Firebase pour enrichissement');
    } catch (error) {
      console.warn('⚠️ Erreur Firebase iOS, utilisation config vide:', error);
      // Sur Vercel, les fichiers data/ ne sont pas déployés, utiliser config vide
      iosData = { servers: [] };
    }
    
    // Android depuis Firebase avec timeout de 5 secondes
    try {
      const androidPromise = getAndroidConfigFromFirebase();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Firebase Android timeout')), 5000)
      );
      androidData = await Promise.race([androidPromise, timeoutPromise]);
      console.log('✅ Config Android chargée depuis Firebase pour enrichissement');
    } catch (error) {
      console.warn('⚠️ Erreur Firebase Android, utilisation config vide:', error);
      // Sur Vercel, les fichiers data/ ne sont pas déployés, utiliser config vide
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

export async function GET() {
  try {
    const servers = await fetchAllServers();
    const enrichedServers = await enrichServersWithVPNConfig(servers);
    
    return NextResponse.json({
      success: true,
      servers: enrichedServers,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in /api/servers:', error);
    return NextResponse.json(
      {
        success: false,
        servers: [],
        error: 'Failed to fetch servers',
      },
      { status: 500 }
    );
  }
}
