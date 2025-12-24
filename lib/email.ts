import { Resend } from 'resend';
import { Alert } from '@/types/alert';

// Lazy initialization - only create Resend instance when needed
let resend: Resend | null = null;

function getResendClient() {
  if (!resend && process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

export async function sendAlertEmail(alerts: Alert[]) {
  const emailTo = process.env.EMAIL_TO;
  const emailFrom = process.env.EMAIL_FROM || 'onboarding@resend.dev';

  if (!emailTo) {
    console.error('EMAIL_TO non configuré');
    return { success: false, error: 'EMAIL_TO non configuré' };
  }

  if (!process.env.RESEND_API_KEY) {
    console.error('RESEND_API_KEY non configuré');
    return { success: false, error: 'RESEND_API_KEY non configuré' };
  }

  const client = getResendClient();
  if (!client) {
    console.error('Impossible d\'initialiser Resend client');
    return { success: false, error: 'Resend client not initialized' };
  }

  try {
    // Regrouper les alertes par sévérité
    const criticalAlerts = alerts.filter(a => a.severity === 'critical');
    const warningAlerts = alerts.filter(a => a.severity === 'warning');

    // Construire le HTML de l'email
    const htmlContent = buildEmailHtml(criticalAlerts, warningAlerts);
    const subject = `⚠️ ${criticalAlerts.length > 0 ? 'URGENT - ' : ''}Alertes Serveurs (${alerts.length} alerte${alerts.length > 1 ? 's' : ''})`;

    const { data, error } = await client.emails.send({
      from: emailFrom,
      to: emailTo,
      subject: subject,
      html: htmlContent,
    });

    if (error) {
      console.error('Erreur envoi email:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Erreur sendAlertEmail:', error);
    return { success: false, error: String(error) };
  }
}

function buildEmailHtml(criticalAlerts: Alert[], warningAlerts: Alert[]): string {
  const now = new Date().toLocaleString('fr-FR', {
    dateStyle: 'full',
    timeStyle: 'short'
  });

  let html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .header { background: #dc2626; color: white; padding: 20px; text-align: center; }
    .header.warning { background: #f59e0b; }
    .content { padding: 20px; }
    .alert-box { background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 15px 0; border-radius: 4px; }
    .alert-box.warning { background: #fffbeb; border-left-color: #f59e0b; }
    .alert-title { font-weight: bold; color: #dc2626; margin-bottom: 8px; font-size: 16px; }
    .alert-title.warning { color: #f59e0b; }
    .alert-detail { color: #666; font-size: 14px; margin: 5px 0; }
    .provider-badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold; margin-right: 8px; }
    .provider-mvps { background: #3b82f6; color: white; }
    .provider-oneprovider { background: #9333ea; color: white; }
    .footer { background: #f9fafb; padding: 15px; text-align: center; color: #6b7280; font-size: 12px; }
    .progress-bar { background: #e5e7eb; height: 20px; border-radius: 10px; overflow: hidden; margin: 8px 0; }
    .progress-fill { height: 100%; background: #dc2626; text-align: center; color: white; font-size: 12px; line-height: 20px; }
    .progress-fill.warning { background: #f59e0b; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header ${criticalAlerts.length === 0 ? 'warning' : ''}">
      <h1 style="margin: 0;">⚠️ Alertes Serveurs</h1>
      <p style="margin: 10px 0 0 0;">${now}</p>
    </div>
    <div class="content">
  `;

  // Alertes critiques
  if (criticalAlerts.length > 0) {
    html += `<h2 style="color: #dc2626;">🚨 Alertes Critiques (${criticalAlerts.length})</h2>`;
    criticalAlerts.forEach(alert => {
      html += buildAlertHtml(alert, false);
    });
  }

  // Alertes warning
  if (warningAlerts.length > 0) {
    html += `<h2 style="color: #f59e0b;">⚠️ Alertes Attention (${warningAlerts.length})</h2>`;
    warningAlerts.forEach(alert => {
      html += buildAlertHtml(alert, true);
    });
  }

  html += `
    </div>
    <div class="footer">
      Dashboard de Surveillance - VPN HyperNet<br>
      Cet email est généré automatiquement.
    </div>
  </div>
</body>
</html>
  `;

  return html;
}

function buildAlertHtml(alert: Alert, isWarning: boolean): string {
  const providerClass = alert.provider === 'mvps' ? 'provider-mvps' : 'provider-oneprovider';
  const providerLabel = alert.provider === 'mvps' ? 'MVPS' : 'OneProvider';
  
  let html = `
    <div class="alert-box ${isWarning ? 'warning' : ''}">
      <div class="alert-title ${isWarning ? 'warning' : ''}">
        <span class="provider-badge ${providerClass}">${providerLabel}</span>
        ${alert.serverName}
      </div>
      <div class="alert-detail">${alert.message}</div>
  `;

  if (alert.type === 'bandwidth' && alert.details.bandwidthPercent !== undefined) {
    const percent = alert.details.bandwidthPercent;
    html += `
      <div class="progress-bar">
        <div class="progress-fill ${isWarning ? 'warning' : ''}" style="width: ${Math.min(percent, 100)}%">
          ${percent.toFixed(1)}%
        </div>
      </div>
      <div class="alert-detail">
        ${alert.details.bandwidthUsed?.toFixed(1)} GB / ${alert.details.bandwidthTotal} GB utilisés
      </div>
    `;
  }

  if (alert.type === 'renewal' && alert.details.daysUntilRenewal !== undefined) {
    html += `
      <div class="alert-detail" style="font-weight: bold;">
        ⏰ Renouvellement dans ${alert.details.daysUntilRenewal} jour${alert.details.daysUntilRenewal > 1 ? 's' : ''}
      </div>
      <div class="alert-detail">
        📅 Date de renouvellement: ${alert.details.renewalDate}
      </div>
    `;
  }

  html += `</div>`;
  return html;
}
