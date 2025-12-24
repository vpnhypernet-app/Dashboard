import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { getAndroidConfigFromFirebase, getIosConfigFromFirebase } from '@/lib/firebase';

/**
 * GET /api/config - Récupérer la configuration
 * - Android depuis Firebase Realtime Database
 * - iOS depuis Firebase Realtime Database
 */
export async function GET() {
  try {
    // iOS - Firebase Realtime Database
    let iosConfig;
    try {
      iosConfig = await getIosConfigFromFirebase();
      console.log('✅ Config iOS chargée depuis Firebase');
    } catch (firebaseError) {
      console.warn('⚠️ Erreur Firebase iOS, fallback vers fichier local:', firebaseError);
      // Fallback vers fichier local
      const iosPath = path.join(process.cwd(), 'data', 'hypernet-iOS.json');
      const iosData = await fs.readFile(iosPath, 'utf8');
      iosConfig = JSON.parse(iosData);
    }
    
    // Android - Firebase Realtime Database
    let androidConfig;
    try {
      androidConfig = await getAndroidConfigFromFirebase();
      console.log('✅ Config Android chargée depuis Firebase');
    } catch (firebaseError) {
      console.warn('⚠️ Erreur Firebase Android, fallback vers fichier local:', firebaseError);
      // Fallback vers fichier local
      const androidPath = path.join(process.cwd(), 'data', 'hypernet-Android.json');
      const androidData = await fs.readFile(androidPath, 'utf8');
      androidConfig = JSON.parse(androidData);
    }
    
    // Transformer les données au format attendu
    const transformedData = {
      ios: transformIOSData(iosConfig),
      android: transformAndroidData(androidConfig),
    };
    
    return NextResponse.json({
      success: true,
      config: transformedData,
      ...transformedData, // Rétro-compatibilité
    });
  } catch (error) {
    console.error('Erreur GET /api/config:', error);
    return NextResponse.json({
      success: false,
      error: 'Erreur lors de la lecture des fichiers de configuration: ' + String(error),
    }, { status: 500 });
  }
}

/**
 * Transformer les données iOS (format array direct)
 */
function transformIOSData(data: any) {
  if (!data.servers || !Array.isArray(data.servers)) {
    return [];
  }
  
  return data.servers.map((server: any) => ({
    id: server.id,
    name: server.city || server.ipaddress,
    ipaddress: server.ipaddress,
    ispremium: server.ispremium,
    isavailable: server.isavailable,
    profiletype: server.profiletype,
    country: server.country,
    city: server.city,
  }));
}

/**
 * Transformer les données Android Realtime Database
 */
function transformAndroidData(data: any) {
  const servers: any[] = [];
  
  if (!data.countries) {
    return servers;
  }
  
  // Parcourir tous les pays
  Object.entries(data.countries).forEach(([countryName, countryData]: [string, any]) => {
    if (!countryData.servers) return;
    
    // Parcourir tous les serveurs du pays
    Object.entries(countryData.servers).forEach(([serverKey, serverData]: [string, any]) => {
      servers.push({
        id: serverData.id || serverKey,
        name: serverData.city || serverKey,
        ipaddress: serverData.ipaddress,
        ispremium: serverData.ispremium,
        isavailable: serverData.isavailable,
        profiletype: serverData.profiletype,
        country: countryName,
        city: serverData.city,
      });
    });
  });
  
  return servers;
}
