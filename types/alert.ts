export interface AlertConfig {
  // Seuils de bande passante (en pourcentage)
  bandwidthThresholds: {
    warning: number; // 75%
    critical: number; // 95%
  };
  
  // Seuils de jours avant renouvellement pour alerter
  renewalDaysThresholds: {
    early: number; // 30 jours
    warning: number; // 7 jours
    critical: number; // 1 jour (la veille)
  };
}

export interface Alert {
  type: 'bandwidth' | 'renewal';
  severity: 'warning' | 'critical';
  serverId: string;
  serverName: string;
  provider: 'mvps' | 'oneprovider';
  message: string;
  details: {
    // Pour bande passante
    bandwidthUsed?: number;
    bandwidthTotal?: number;
    bandwidthPercent?: number;
    
    // Pour renouvellement
    renewalDate?: string;
    daysUntilRenewal?: number;
  };
  timestamp: string;
}

export const DEFAULT_ALERT_CONFIG: AlertConfig = {
  bandwidthThresholds: {
    warning: 75,
    critical: 95,
  },
  renewalDaysThresholds: {
    early: 30,
    warning: 7,
    critical: 1,
  },
};
