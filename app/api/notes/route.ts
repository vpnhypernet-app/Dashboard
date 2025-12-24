import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const NOTES_FILE = path.join(process.cwd(), 'data', 'notes.txt');

export async function GET() {
  try {
    const notes = await fs.readFile(NOTES_FILE, 'utf-8');
    return NextResponse.json({ success: true, notes });
  } catch (error) {
    // Si le fichier n'existe pas, retourner une chaîne vide
    if ((error as any).code === 'ENOENT') {
      return NextResponse.json({ success: true, notes: '' });
    }
    console.error('Erreur lecture notes:', error);
    return NextResponse.json({ success: false, error: 'Erreur lecture notes' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { notes } = await request.json();
    
    // Créer le dossier data s'il n'existe pas
    const dataDir = path.join(process.cwd(), 'data');
    try {
      await fs.access(dataDir);
    } catch {
      await fs.mkdir(dataDir, { recursive: true });
    }
    
    await fs.writeFile(NOTES_FILE, notes, 'utf-8');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erreur sauvegarde notes:', error);
    return NextResponse.json({ success: false, error: 'Erreur sauvegarde notes' }, { status: 500 });
  }
}
