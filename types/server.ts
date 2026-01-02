export interface VpnEntry {
  available: boolean;
  isPremium: boolean;
  profileType?: string;
  refPath?: string; // chemin précis dans Firebase pour cibler un doublon
  id?: string;      // identifiant Firebase/ordre
  order?: number | string;
  country?: string;
  name?: string;
}

export interface VpnConfig {
  ios?: VpnEntry;
  android?: VpnEntry;
  iosMultiple?: VpnEntry[];
  androidMultiple?: VpnEntry[];
}

export interface Server {
  id: string;
  name: string;
  ip: string;
  provider: 'mvps' | 'oneprovider';
  status: 'online' | 'offline' | 'maintenance';
  cpu: number; // vCPU count or percentage
  ram: number; // MB or percentage
  disk: number; // GB total
  diskUsage?: number; // GB used
  bandwidth: {
    used: number; // GB
    total: number; // GB
  };
  price: number; // monthly cost
  currency: string;
  location?: string;
  renewalDate?: string; // Date de renouvellement (MVPS uniquement)
  vpnConfig?: VpnConfig;
}

export interface ApiResponse {
  success: boolean;
  servers: Server[];
  error?: string;
}
