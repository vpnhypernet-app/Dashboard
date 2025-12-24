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
  vpnConfig?: {
    ios?: {
      available: boolean;
      isPremium: boolean;
      profileType: string;
    };
    android?: {
      available: boolean;
      isPremium: boolean;
      profileType: string;
    };
  };
}

export interface ApiResponse {
  success: boolean;
  servers: Server[];
  error?: string;
}
