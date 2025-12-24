'use client';

import { useEffect, useState } from 'react';
import { RemoteConfigData, ServerConfig, Platform, ServerTier } from '@/types/config';

export default function ConfigPanel() {
  const [config, setConfig] = useState<RemoteConfigData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>('ios');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
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

  const updateServer = async (serverId: string, tier?: ServerTier, available?: boolean) => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      
      const response = await fetch('/api/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: selectedPlatform,
          serverId,
          tier,
          available,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSuccess(`Serveur ${serverId} mis à jour avec succès`);
        await fetchConfig(); // Recharger la config
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Erreur lors de la mise à jour');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const getTierBadgeClass = (tier: ServerTier) => {
    switch (tier) {
      case 'premium':
        return 'bg-yellow-500 text-white';
      case 'free':
        return 'bg-gray-500 text-white';
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
        <h2 className="text-2xl font-bold text-white mb-2">⚙️ Configuration Firebase Remote Config</h2>
        <p className="text-gray-400">Gérer les serveurs iOS et Android (Premium/Gratuit/Non disponible)</p>
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
        </div>
      )}
      {success && (
        <div className="mb-4 bg-green-900/50 border border-green-700 rounded p-3 text-green-300">
          ✅ {success}
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
        <div className="text-center text-gray-400 py-8">
          Aucun serveur configuré pour {selectedPlatform.toUpperCase()}
        </div>
      ) : (
        <div className="space-y-3">
          {servers.map((server: ServerConfig) => (
            <div
              key={server.id}
              className={`bg-gray-900 border rounded-lg p-4 ${
                !server.available ? 'border-red-700' : 'border-gray-700'
              }`}
            >
              <div className="flex items-center justify-between">
                {/* Server Info */}
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white mb-1">{server.name}</h3>
                  <div className="flex items-center gap-3 text-sm text-gray-400">
                    <span>📍 {server.location}</span>
                    <span>🔑 {server.id}</span>
                    {server.ip && <span className="font-mono">{server.ip}</span>}
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      server.provider === 'mvps' ? 'bg-blue-600' : 'bg-purple-600'
                    }`}>
                      {server.provider.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-3">
                  {/* Tier Selector */}
                  <select
                    value={server.tier}
                    onChange={(e) => updateServer(server.id, e.target.value as ServerTier)}
                    disabled={saving}
                    className="px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="premium">⭐ Premium</option>
                    <option value="free">🆓 Gratuit</option>
                    <option value="unavailable">🚫 Non disponible</option>
                  </select>

                  {/* Available Toggle */}
                  <button
                    onClick={() => updateServer(server.id, undefined, !server.available)}
                    disabled={saving}
                    className={`px-4 py-2 rounded font-semibold transition-all ${
                      server.available
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : 'bg-red-600 hover:bg-red-700 text-white'
                    }`}
                  >
                    {server.available ? '✓ Disponible' : '✗ Indisponible'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="bg-gray-900 rounded p-4 border border-gray-700">
          <div className="text-sm text-gray-400 mb-1">Premium</div>
          <div className="text-2xl font-bold text-yellow-500">
            {servers.filter((s: ServerConfig) => s.tier === 'premium').length}
          </div>
        </div>
        <div className="bg-gray-900 rounded p-4 border border-gray-700">
          <div className="text-sm text-gray-400 mb-1">Gratuit</div>
          <div className="text-2xl font-bold text-gray-400">
            {servers.filter((s: ServerConfig) => s.tier === 'free').length}
          </div>
        </div>
        <div className="bg-gray-900 rounded p-4 border border-gray-700">
          <div className="text-sm text-gray-400 mb-1">Non disponible</div>
          <div className="text-2xl font-bold text-red-500">
            {servers.filter((s: ServerConfig) => s.tier === 'unavailable' || !s.available).length}
          </div>
        </div>
      </div>
    </div>
  );
}
