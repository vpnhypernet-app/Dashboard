'use client';

import { Server } from '@/types/server';

interface ServerCardProps {
  server: Server;
  onVPNConfigChange?: (serverIp: string, platform: 'ios' | 'android', status: string) => void;
}

export default function ServerCard({ server, onVPNConfigChange }: ServerCardProps) {
  const getStatusColor = (status: Server['status']) => {
    switch (status) {
      case 'online':
        return 'bg-green-500';
      case 'offline':
        return 'bg-red-500';
      case 'maintenance':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getProviderBadge = (provider: Server['provider']) => {
    return provider === 'mvps' ? 'MVPS' : 'OneProvider';
  };

  return (
    <div className={`rounded-lg p-4 shadow-lg border transition-all h-full flex flex-col ${
        server.status === 'offline' 
          ? 'bg-red-950/30 border-red-900/50 hover:border-red-800/50' 
          : 'bg-gray-800 border-gray-700 hover:border-gray-600'
      }`}>
        {/* Header */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1 min-w-0 mr-2">
            <h3 className="text-lg font-bold text-white mb-1 truncate" title={server.name}>{server.name}</h3>
            <p className="text-gray-400 text-sm font-mono">{server.ip}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
              server.provider === 'mvps' ? 'bg-blue-600 text-white' : 'bg-purple-600 text-white'
            }`}>
              {getProviderBadge(server.provider)}
            </span>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${getStatusColor(server.status)}`} />
              <span className="text-sm text-gray-300 capitalize">{server.status}</span>
            </div>
          </div>
        </div>

        {/* Location */}
        {server.location && (
          <div className="mb-2">
            <span className="text-gray-400 text-sm">📍 {server.location}</span>
          </div>
        )}

        {/* VPN Config Status */}
        {server.vpnConfig && (
          <div className="mb-3 space-y-2">
            {server.vpnConfig.ios && (
              <div className="flex items-center justify-between">
                <span className="text-gray-300 text-xs font-semibold">🍎 iOS</span>
                <select
                  value={
                    !server.vpnConfig.ios.available ? 'indisponible' :
                    server.vpnConfig.ios.isPremium ? 'premium' : 'gratuit'
                  }
                  onChange={(e) => onVPNConfigChange?.(server.ip, 'ios', e.target.value)}
                  className="bg-gray-700 text-white text-xs px-2 py-1 rounded border border-gray-600"
                >
                  <option value="premium">⭐ Premium</option>
                  <option value="gratuit">✓ Gratuit</option>
                  <option value="indisponible">🚫 Indisponible</option>
                </select>
              </div>
            )}
            {server.vpnConfig.android && (
              <div className="flex items-center justify-between">
                <span className="text-gray-300 text-xs font-semibold">🤖 Android</span>
                <select
                  value={
                    !server.vpnConfig.android.available ? 'indisponible' :
                    server.vpnConfig.android.isPremium ? 'premium' : 'gratuit'
                  }
                  onChange={(e) => onVPNConfigChange?.(server.ip, 'android', e.target.value)}
                  className="bg-gray-700 text-white text-xs px-2 py-1 rounded border border-gray-600"
                >
                  <option value="premium">⭐ Premium</option>
                  <option value="gratuit">✓ Gratuit</option>
                  <option value="indisponible">🚫 Indisponible</option>
                </select>
              </div>
            )}
          </div>
        )}

        {/* Renewal Date (MVPS only) */}
        {server.renewalDate && server.provider === 'mvps' && (
          <div className="mb-3 bg-blue-900/30 border border-blue-700/50 rounded px-2 py-1">
            <span className="text-blue-300 text-sm font-semibold">📅 Renouvellement: {server.renewalDate}</span>
          </div>
        )}

        {/* Specs */}
        <div className="mb-3 text-sm text-gray-400 space-y-1">
          {server.cpu > 0 && <div>💻 {server.cpu} vCPU{server.cpu > 1 ? 's' : ''}</div>}
          {server.ram > 0 && <div>🧠 {server.ram} GB RAM</div>}
        </div>

        {/* Disk Usage */}
        {server.diskUsage !== undefined && server.disk > 0 && (
          <div className="mb-3">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-400">Espace disque</span>
              <span className="text-white font-semibold">
                {server.diskUsage.toFixed(0)} / {server.disk} GB
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  server.diskUsage > server.disk ? 'bg-red-500' :
                  (server.diskUsage / server.disk) > 0.8 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min((server.diskUsage / server.disk) * 100, 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Bandwidth */}
        {server.bandwidth.total > 0 && (
          <div className="mb-3">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-400">Bande passante</span>
              <span className="text-white font-semibold">
                {server.bandwidth.used.toFixed(0)} / {server.bandwidth.total} GB
              </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                server.bandwidth.used > server.bandwidth.total ? 'bg-red-500' :
                (server.bandwidth.used / server.bandwidth.total) > 0.8 ? 'bg-yellow-500' : 'bg-blue-500'
              }`}
              style={{ width: `${Math.min((server.bandwidth.used / server.bandwidth.total) * 100, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Price */}
      <div className="pt-3 border-t border-gray-700 mt-auto">
        <div className="flex justify-between items-center">
          <span className="text-gray-400 text-sm">Prix mensuel</span>
          <span className="text-xl font-bold text-white">
            {server.currency === 'EUR' ? '€' : '$'}{server.price.toFixed(2)}
            <span className="text-sm text-gray-400 font-normal">/mois</span>
          </span>
        </div>
      </div>
    </div>
  );
}
