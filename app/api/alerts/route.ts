import { NextResponse } from 'next/server';
import { Alert, DEFAULT_ALERT_CONFIG } from '@/types/alert';
import { Server } from '@/types/server';
import { sendAlertEmail } from '@/lib/email';
import { markServerUnavailable, markServerPremium } from '@/lib/firebase';

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
    
    // Automatisation Firebase Remote Config
    const firebaseEnabled =
      (process.env.FIREBASE_IOS_PROJECT_ID && process.env.FIREBASE_IOS_PRIVATE_KEY) ||
      (process.env.FIREBASE_ANDROID_PROJECT_ID && process.env.FIREBASE_ANDROID_PRIVATE_KEY);
    if (firebaseEnabled) {
      await automateServerAvailability(servers);
    }
    
    if (alerts.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'Aucune alerte',
        alertCount: 0,
        firebaseAutomation: firebaseEnabled ? 'enabled' : 'disabled'
      });
    }

    // Envoyer l'email
    const emailResult = await sendAlertEmail(alerts);
    
    if (!emailResult.success) {
      return NextResponse.json({ 
        success: false, 
        error: emailResult.error,
        alerts,
        alertCount: alerts.length,
        firebaseAutomation: firebaseEnabled ? 'enabled' : 'disabled'
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: `${alerts.length} alerte(s) envoyée(s) par email`,
      alertCount: alerts.length,
      alerts,
      firebaseAutomation: firebaseEnabled ? 'enabled' : 'disabled'
    });

  } catch (error) {
    console.error('Erreur vérification alertes:', error);
    return NextResponse.json({ 
      success: false, 
      error: String(error) 
    }, { status: 500 });
  }
}

/**
 * Automatiser la disponibilité des serveurs dans Firebase Remote Config
 * Règle: Si bande passante >= 95% => unavailable, sinon => premium
 */
async function automateServerAvailability(servers: Server[]) {
  const config = DEFAULT_ALERT_CONFIG;
  
  for (const server of servers) {
    if (server.bandwidth.total > 0) {
      const bandwidthPercent = (server.bandwidth.used / server.bandwidth.total) * 100;
      
      try {
        if (bandwidthPercent >= config.bandwidthThresholds.critical) {
          // Marquer comme non disponible
          await markServerUnavailable(server.id, server.name);
          console.log(`✅ Serveur ${server.name} marqué comme non disponible (${bandwidthPercent.toFixed(1)}%)`);
        } else if (bandwidthPercent < config.bandwidthThresholds.critical) {
          // Remettre en premium si sous le seuil critique
          await markServerPremium(server.id, server.name);
          console.log(`✅ Serveur ${server.name} marqué comme premium (${bandwidthPercent.toFixed(1)}%)`);
        }
      } catch (error) {
        console.warn(`⚠️ Impossible de mettre à jour ${server.name} dans Firebase:`, error);
      }
    }
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
        
        // Alerte à 30 jours
        if (daysUntilRenewal <= config.renewalDaysThresholds.early && daysUntilRenewal > config.renewalDaysThresholds.warning) {
          alerts.push({
            type: 'renewal',
            severity: 'warning',
            serverId: server.id,
            serverName: server.name,
            provider: server.provider,
            message: `📅 Rappel: Renouvellement dans ${daysUntilRenewal} jours`,
            details: {
              renewalDate: server.renewalDate,
              daysUntilRenewal,
            },
            timestamp: new Date().toISOString(),
          });
        }
        // Alerte à 7 jours
        else if (daysUntilRenewal <= config.renewalDaysThresholds.warning && daysUntilRenewal > config.renewalDaysThresholds.critical) {
          alerts.push({
            type: 'renewal',
            severity: 'warning',
            serverId: server.id,
            serverName: server.name,
            provider: server.provider,
            message: `⚠️ ATTENTION: Renouvellement dans ${daysUntilRenewal} jours`,
            details: {
              renewalDate: server.renewalDate,
              daysUntilRenewal,
            },
            timestamp: new Date().toISOString(),
          });
        }
        // Alerte critique (la veille et le jour même)
        else if (daysUntilRenewal <= config.renewalDaysThresholds.critical && daysUntilRenewal >= 0) {
          alerts.push({
            type: 'renewal',
            severity: 'critical',
            serverId: server.id,
            serverName: server.name,
            provider: server.provider,
            message: daysUntilRenewal === 0 
              ? `🚨 URGENT: Renouvellement AUJOURD'HUI !`
              : `🚨 URGENT: Renouvellement DEMAIN !`,
            details: {
              renewalDate: server.renewalDate,
              daysUntilRenewal,
            },
            timestamp: new Date().toISOString(),
          });
        }
        // Renouvellement dépassé
        else if (daysUntilRenewal < 0) {
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
