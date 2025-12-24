import { NextRequest, NextResponse } from 'next/server';
import { getRemoteConfig, updateRemoteConfig, updateServerInRemoteConfig } from '@/lib/firebase';
import { UpdateServerConfigRequest } from '@/types/config';

/**
 * GET /api/config - Récupérer la configuration Remote Config
 */
export async function GET() {
  try {
    const config = await getRemoteConfig();
    
    return NextResponse.json({
      success: true,
      config,
    });
  } catch (error) {
    console.error('Erreur GET /api/config:', error);
    return NextResponse.json({
      success: false,
      error: String(error),
    }, { status: 500 });
  }
}

/**
 * POST /api/config - Mettre à jour la configuration complète d'une plateforme
 * Body: { platform: 'ios' | 'android', config: PlatformConfig }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { platform, config } = body;
    
    if (!platform || !config) {
      return NextResponse.json({
        success: false,
        error: 'Platform et config requis',
      }, { status: 400 });
    }
    
    if (platform !== 'ios' && platform !== 'android') {
      return NextResponse.json({
        success: false,
        error: 'Platform doit être ios ou android',
      }, { status: 400 });
    }
    
    await updateRemoteConfig(platform, config);
    
    return NextResponse.json({
      success: true,
      message: `Configuration ${platform} mise à jour`,
    });
  } catch (error) {
    console.error('Erreur POST /api/config:', error);
    return NextResponse.json({
      success: false,
      error: String(error),
    }, { status: 500 });
  }
}

/**
 * PATCH /api/config - Mettre à jour un serveur spécifique
 * Body: { platform: 'ios' | 'android', serverId: string, tier?: string, available?: boolean }
 */
export async function PATCH(request: NextRequest) {
  try {
    const body: UpdateServerConfigRequest = await request.json();
    const { platform, serverId, tier, available } = body;
    
    if (!platform || !serverId) {
      return NextResponse.json({
        success: false,
        error: 'Platform et serverId requis',
      }, { status: 400 });
    }
    
    if (platform !== 'ios' && platform !== 'android') {
      return NextResponse.json({
        success: false,
        error: 'Platform doit être ios ou android',
      }, { status: 400 });
    }
    
    const updates: { tier?: string; available?: boolean } = {};
    if (tier !== undefined) updates.tier = tier;
    if (available !== undefined) updates.available = available;
    
    await updateServerInRemoteConfig(platform, serverId, updates);
    
    return NextResponse.json({
      success: true,
      message: `Serveur ${serverId} mis à jour sur ${platform}`,
    });
  } catch (error) {
    console.error('Erreur PATCH /api/config:', error);
    return NextResponse.json({
      success: false,
      error: String(error),
    }, { status: 500 });
  }
}
