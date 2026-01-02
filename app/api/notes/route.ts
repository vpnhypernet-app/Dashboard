import { NextResponse } from 'next/server';
import { realtimeDB } from '@/lib/firebase';

// Chemin dans Realtime Database pour les notes
const NOTES_PATH = 'dashboard/notes';

export async function GET() {
  try {
    const snapshot = await realtimeDB.ref(NOTES_PATH).once('value');
    const notes = snapshot.val() || '';
    return NextResponse.json({ success: true, notes });
  } catch (error: any) {
    console.error('Erreur lecture notes:', error);
    return NextResponse.json({ success: true, notes: '' });
  }
}

export async function POST(request: Request) {
  try {
    const { notes } = await request.json();
    
    await realtimeDB.ref(NOTES_PATH).set(notes);
    
    console.log('✅ Notes sauvegardées avec succès dans Realtime Database');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erreur sauvegarde notes:', error);
    return NextResponse.json({ success: false, error: 'Erreur sauvegarde notes' }, { status: 500 });
  }
}
