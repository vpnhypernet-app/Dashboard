export type ServerTier = 'premium' | 'free' | 'unavailable';
export type Platform = 'ios' | 'android';

export interface ServerConfig {
  id: string;
  name: string;
  location: string;
  tier: ServerTier;
  available: boolean;
  provider: 'mvps' | 'oneprovider';
  ip?: string;
}

export interface PlatformConfig {
  servers: ServerConfig[];
  lastUpdated: string;
}

export interface RemoteConfigData {
  ios: PlatformConfig;
  android: PlatformConfig;
}

export interface UpdateServerConfigRequest {
  platform: Platform;
  serverId: string;
  tier?: ServerTier;
  available?: boolean;
}
