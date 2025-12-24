import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { updateAndroidServerInFirebase, updateIosServerInFirebase } from '@/lib/firebase';

export async function POST(request: Request) {
  try {
    const { serverIp, platform, status } = await request.json();
    
    if (!serverIp || !platform || !status) {
      return NextResponse.json(
        { error: 'Paramètres manquants' },
        { status: 400 }
      );
    }

    const isPremium = status === 'premium';
    const isAvailable = status !== 'unavailable';

    if (platform === 'ios') {
      // 🔥 Mise à jour iOS dans Firebase Realtime Database
      try {
        const updated = await updateIosServerInFirebase(serverIp, isPremium, isAvailable);
        
        if (updated) {
          return NextResponse.json({ 
            success: true, 
            message: '🔥 Config iOS mise à jour dans Firebase',
            updated: { serverIp, platform, status },
            source: 'firebase'
          });
        } else {
          return NextResponse.json(
            { error: 'Serveur iOS non trouvé dans Firebase' },
            { status: 404 }
          );
        }
      } catch (firebaseError) {
        console.error('Erreur Firebase iOS, fallback vers fichier local:', firebaseError);
        
        // Fallback vers fichier local si Firebase échoue
        const iosPath = path.join(process.cwd(), 'data', 'hypernet-iOS.json');
        const iosData = JSON.parse(await fs.readFile(iosPath, 'utf8'));
        
        if (iosData.servers && Array.isArray(iosData.servers)) {
          const serverIndex = iosData.servers.findIndex((s: any) => s.ipaddress === serverIp);
          
          if (serverIndex !== -1) {
            iosData.servers[serverIndex].ispremium = isPremium ? 1 : 0;
            iosData.servers[serverIndex].isavailable = isAvailable ? 1 : 0;
            
            await fs.writeFile(iosPath, JSON.stringify(iosData, null, 2));
            
            return NextResponse.json({ 
              success: true, 
              message: 'Config iOS mise à jour (fichier local - fallback)',
              updated: { serverIp, platform, status },
              source: 'local-fallback'
            });
          }
        }
        
        return NextResponse.json(
          { error: 'Serveur iOS non trouvé' },
          { status: 404 }
        );
      }
      
    } else if (platform === 'android') {
      // 🔥 Mise à jour Android dans Firebase Realtime Database
      try {
        const updated = await updateAndroidServerInFirebase(serverIp, isPremium, isAvailable);
        
        if (updated) {
          return NextResponse.json({ 
            success: true, 
            message: '🔥 Config Android mise à jour dans Firebase',
            updated: { serverIp, platform, status },
            source: 'firebase'
          });
        } else {
          return NextResponse.json(
            { error: 'Serveur Android non trouvé dans Firebase' },
            { status: 404 }
          );
        }
      } catch (firebaseError) {
        console.error('Erreur Firebase, fallback vers fichier local:', firebaseError);
        
        // Fallback vers fichier local si Firebase échoue
        const androidPath = path.join(process.cwd(), 'data', 'hypernet-Android.json');
        const androidData = JSON.parse(await fs.readFile(androidPath, 'utf8'));
        
        if (androidData.countries) {
          let found = false;
          
          for (const country of Object.values(androidData.countries) as any[]) {
            if (country.servers) {
              for (const server of Object.values(country.servers) as any[]) {
                if (server.ipaddress === serverIp) {
                  server.ispremium = isPremium ? 1 : 0;
                  server.isavailable = isAvailable ? 1 : 0;
                  found = true;
                  break;
                }
              }
            }
            if (found) break;
          }
          
          if (found) {
            await fs.writeFile(androidPath, JSON.stringify(androidData, null, 2));
            
            return NextResponse.json({ 
              success: true, 
              message: 'Config Android mise à jour (fichier local - fallback)',
              updated: { serverIp, platform, status },
              source: 'local-fallback'
            });
          }
        }
        
        return NextResponse.json(
          { error: 'Serveur Android non trouvé' },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Plateforme invalide' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Erreur mise à jour config:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
