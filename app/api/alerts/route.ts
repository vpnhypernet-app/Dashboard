import { NextResponse } from 'next/server';
import { Alert, DEFAULT_ALERT_CONFIG } from '@/types/alert';
import { Server } from '@/types/server';
import { sendAlertEmail } from '@/lib/email';

export async function GET() {
  try {
    // Récupérer les serveurs
    const serversResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/servers`, {
      cache: 'no-store'
    });
    
    if (!serversResponse.ok) {
      return NextResponse.json({ 
        success: false, 
        error: 'Impossible de récupérer les serveurs' 
      }, { status: 500 });
    }

    const { servers } = await serversResponse.json();
    
    // Vérifier les alertes
    const alerts = checkAlerts(servers);
    
    if (alerts.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'Aucune alerte',
        alertCount: 0 
      });
    }

    // Envoyer l'email
    const emailResult = await sendAlertEmail(alerts);
    
    if (!emailResult.success) {
      return NextResponse.json({ 
        success: false, 
        error: emailResult.error,
        alerts,
        alertCount: alerts.length 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: `${alerts.length} alerte(s) envoyée(s) par email`,
      alertCount: alerts.length,
      alerts 
    });

  } catch (error) {
    console.error('Erreur vérification alertes:', error);
    return NextResponse.json({ 
      success: false, 
      error: String(error) 
    }, { status: 500 });
  }
}

function checkAlerts(servers: Server[]): Alert[] {
  const alerts: Alert[] = [];
  const config = DEFAULT_ALERT_CONFIG;

  servers.forEach(server => {
    // 1. Vérifier la bande passante
    if (server.bandwidth.total > 0) {
      const bandwidthPercent = (server.bandwidth.used / server.bandwidth.total) * 100;
      
      if (bandwidthPercent >= config.bandwidthThresholds.critical) {
        alerts.push({
          type: 'bandwidth',
          severity: 'critical',
          serverId: server.id,
          serverName: server.name,
          provider: server.provider,
          message: `⚠️ CRITIQUE: Bande passante à ${bandwidthPercent.toFixed(1)}% (seuil: ${config.bandwidthThresholds.critical}%)`,
          details: {
            bandwidthUsed: server.bandwidth.used,
            bandwidthTotal: server.bandwidth.total,
            bandwidthPercent,
          },
          timestamp: new Date().toISOString(),
        });
      } else if (bandwidthPercent >= config.bandwidthThresholds.warning) {
        alerts.push({
          type: 'bandwidth',
          severity: 'warning',
          serverId: server.id,
          serverName: server.name,
          provider: server.provider,
          message: `⚠️ ATTENTION: Bande passante à ${bandwidthPercent.toFixed(1)}% (seuil: ${config.bandwidthThresholds.warning}%)`,
          details: {
            bandwidthUsed: server.bandwidth.used,
            bandwidthTotal: server.bandwidth.total,
            bandwidthPercent,
          },
          timestamp: new Date().toISOString(),
        });
      }
    }

    // 2. Vérifier la date de renouvellement (MVPS uniquement)
    if (server.renewalDate && server.provider === 'mvps') {
      const renewalDate = parseRenewalDate(server.renewalDate);
      if (renewalDate) {
        const today = new Date();
        const daysUntilRenewal = Math.ceil((renewalDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysUntilRenewal <= config.renewalDaysThreshold && daysUntilRenewal > 0) {
          alerts.push({
            type: 'renewal',
            severity: daysUntilRenewal <= 3 ? 'critical' : 'warning',
            serverId: server.id,
            serverName: server.name,
            provider: server.provider,
            message: daysUntilRenewal <= 3 
              ? `🚨 URGENT: Renouvellement dans ${daysUntilRenewal} jour${daysUntilRenewal > 1 ? 's' : ''} !`
              : `⚠️ Renouvellement proche: dans ${daysUntilRenewal} jours`,
            details: {
              renewalDate: server.renewalDate,
              daysUntilRenewal,
            },
            timestamp: new Date().toISOString(),
          });
        } else if (daysUntilRenewal <= 0) {
          // Renouvellement dépassé
          alerts.push({
            type: 'renewal',
            severity: 'critical',
            serverId: server.id,
            serverName: server.name,
            provider: server.provider,
            message: `🚨 URGENT: Date de renouvellement dépassée de ${Math.abs(daysUntilRenewal)} jour${Math.abs(daysUntilRenewal) > 1 ? 's' : ''} !`,
            details: {
              renewalDate: server.renewalDate,
              daysUntilRenewal: Math.abs(daysUntilRenewal),
            },
            timestamp: new Date().toISOString(),
          });
        }
      }
    }
  });

  return alerts;
}

function parseRenewalDate(dateStr: string): Date | null {
  try {
    // Format attendu: "DD/MM/YYYY" ou "YYYY-MM-DD"
    if (dateStr.includes('/')) {
      const [day, month, year] = dateStr.split('/').map(Number);
      return new Date(year, month - 1, day);
    } else if (dateStr.includes('-')) {
      return new Date(dateStr);
    }
    return null;
  } catch {
    return null;
  }
}
