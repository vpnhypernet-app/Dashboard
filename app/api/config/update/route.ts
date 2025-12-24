import { NextResponse } from 'next/server';
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
    const isAvailable = status !== 'indisponible';

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
        console.error('Erreur Firebase iOS:', firebaseError);
        return NextResponse.json(
          { error: 'Erreur Firebase iOS: ' + String(firebaseError) },
          { status: 500 }
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
        console.error('Erreur Firebase Android:', firebaseError);
        return NextResponse.json(
          { error: 'Erreur Firebase Android: ' + String(firebaseError) },
          { status: 500 }
        );
      }
      
    } else {
      return NextResponse.json(
        { error: 'Plateforme invalide' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Erreur mise à jour config:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
