'use client';

import { useEffect, useState } from 'react';
import { RemoteConfigData, ServerConfig, Platform, ServerTier } from '@/types/config';

export default function ConfigPanel() {
  const [config, setConfig] = useState<RemoteConfigData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>('ios');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/config');
      const data = await response.json();
      
      if (data.success) {
        setConfig(data.config);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Erreur lors du chargement de la configuration');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getTierBadgeClass = (tier: ServerTier) => {
    switch (tier) {
      case 'premium':
        return 'bg-yellow-500 text-white';
      case 'free':
        return 'bg-blue-500 text-white';
      case 'unavailable':
        return 'bg-red-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getTierLabel = (tier: ServerTier) => {
    switch (tier) {
      case 'premium':
        return '⭐ Premium';
      case 'free':
        return '🆓 Gratuit';
      case 'unavailable':
        return '🚫 Non disponible';
      default:
        return tier;
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          <span className="ml-3 text-gray-400">Chargement de la configuration...</span>
        </div>
      </div>
    );
  }

  const platformConfig = config?.[selectedPlatform];
  const servers = platformConfig?.servers || [];

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">📱 Configuration Remote Config iOS/Android</h2>
        <p className="text-gray-400">Visualisation des serveurs configurés dans Firebase Remote Config</p>
        {platformConfig?.lastUpdated && (
          <p className="text-sm text-gray-500 mt-1">
            Dernière mise à jour: {new Date(platformConfig.lastUpdated).toLocaleString('fr-FR')}
          </p>
        )}
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-4 bg-red-900/50 border border-red-700 rounded p-3 text-red-300">
          ❌ {error}
          <p className="text-xs mt-2 text-red-400">
            Vérifiez que Firebase est configuré dans .env.local
          </p>
        </div>
      )}

      {/* Platform Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setSelectedPlatform('ios')}
          className={`px-6 py-2 rounded-lg font-semibold transition-all ${
            selectedPlatform === 'ios'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          🍎 iOS ({config?.ios?.servers?.length || 0})
        </button>
        <button
          onClick={() => setSelectedPlatform('android')}
          className={`px-6 py-2 rounded-lg font-semibold transition-all ${
            selectedPlatform === 'android'
              ? 'bg-green-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          🤖 Android ({config?.android?.servers?.length || 0})
        </button>
        <button
          onClick={fetchConfig}
          className="ml-auto px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-all"
          disabled={loading}
        >
          🔄 Actualiser
        </button>
      </div>

      {/* Servers List */}
      {servers.length === 0 ? (
        <div className="text-center py-12 bg-gray-900 rounded-lg border border-gray-700">
          <div className="text-6xl mb-4">📭</div>
          <p className="text-gray-400 text-lg mb-2">
            Aucun serveur configuré pour {selectedPlatform.toUpperCase()}
          </p>
          <p className="text-gray-500 text-sm">
            Configurez vos serveurs dans Firebase Console → Remote Config
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {servers.map((server: ServerConfig) => (
            <div
              key={server.id}
              className={`bg-gray-900 border rounded-lg p-4 transition-all hover:border-gray-600 ${
                !server.available ? 'border-red-700 opacity-75' : 'border-gray-700'
              }`}
            >
              <div className="flex items-center justify-between">
                {/* Server Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-white">{server.name}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${getTierBadgeClass(server.tier)}`}>
                      {getTierLabel(server.tier)}
                    </span>
                    {(server as any).profiletype && (
                      <span className="px-2 py-0.5 rounded text-xs font-semibold bg-indigo-600 text-white">
                        {(server as any).profiletype.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-400 flex-wrap">
                    <span>📍 {server.location}</span>
                    {server.ip && <span className="font-mono text-gray-500">{server.ip}</span>}
                    {(server as any).port && (
                      <span className="text-gray-500">
                        Port: {(server as any).port}
                      </span>
                    )}
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                      server.available ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                    }`}>
                      {server.available ? '✓ Disponible' : '✗ Indisponible'}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1 font-mono">
                    ID: {server.id}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="mt-6 grid grid-cols-4 gap-4">
        <div className="bg-gray-900 rounded p-4 border border-gray-700">
          <div className="text-sm text-gray-400 mb-1">Total</div>
          <div className="text-2xl font-bold text-white">
            {servers.length}
          </div>
        </div>
        <div className="bg-gray-900 rounded p-4 border border-yellow-700/50">
          <div className="text-sm text-gray-400 mb-1">Premium</div>
          <div className="text-2xl font-bold text-yellow-500">
            {servers.filter((s: ServerConfig) => s.tier === 'premium').length}
          </div>
        </div>
        <div className="bg-gray-900 rounded p-4 border border-blue-700/50">
          <div className="text-sm text-gray-400 mb-1">Gratuit</div>
          <div className="text-2xl font-bold text-blue-500">
            {servers.filter((s: ServerConfig) => s.tier === 'free').length}
          </div>
        </div>
        <div className="bg-gray-900 rounded p-4 border border-green-700/50">
          <div className="text-sm text-gray-400 mb-1">Disponibles</div>
          <div className="text-2xl font-bold text-green-500">
            {servers.filter((s: ServerConfig) => s.available).length}
          </div>
        </div>
      </div>
    </div>
  );
}
