import { NextResponse } from 'next/server';
import { fetchAllServers } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const servers = await fetchAllServers();
    
    return NextResponse.json({
      success: true,
      servers,
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
