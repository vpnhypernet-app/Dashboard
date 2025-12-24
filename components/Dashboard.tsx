'use client';

import { useEffect, useState } from 'react';
import ServerCard from './ServerCard';
import ConfigPanel from './ConfigPanel';
import { Server } from '@/types/server';

export default function Dashboard() {
  const [servers, setServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [filterProvider, setFilterProvider] = useState<'all' | 'mvps' | 'oneprovider'>('all');
  const [showConfig, setShowConfig] = useState(false);

  const fetchServers = async () => {
    try {
      setError(null);
      const response = await fetch('/api/servers');
      const data = await response.json();

      if (data.success) {
        setServers(data.servers);
        setLastUpdate(new Date().toLocaleTimeString('fr-FR'));
      } else {
        setError(data.error || 'Failed to fetch servers');
      }
    } catch (err) {
      setError('Network error occurred');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServers();
  }, []);

  const filteredServers = filterProvider === 'all' 
    ? servers 
    : servers.filter(s => s.provider === filterProvider);

  const totalCostUSD = filteredServers
    .filter(s => s.currency === 'USD')
    .reduce((sum, server) => sum + server.price, 0);
  
  const totalCostEUR = filteredServers
    .filter(s => s.currency === 'EUR')
    .reduce((sum, server) => sum + server.price, 0);
  
  const onlineServers = filteredServers.filter(s => s.status === 'online').length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Chargement des serveurs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Tableau de Bord Serveurs</h1>
            <p className="text-gray-400">Surveillance de vos serveurs MVPS et OneProvider</p>
          </div>
          <button
            onClick={() => setShowConfig(!showConfig)}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              showConfig 
                ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                : 'bg-gray-700 hover:bg-gray-600 text-white'
            }`}
          >
            ⚙️ {showConfig ? 'Masquer Config' : 'Configuration Firebase'}
          </button>
        </div>

        {/* Configuration Panel */}
        {showConfig && (
          <div className="mb-8">
            <ConfigPanel />
          </div>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="text-gray-400 text-sm mb-1">Total Serveurs</div>
            <div className="text-3xl font-bold text-white">{filteredServers.length}</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="text-gray-400 text-sm mb-1">Serveurs en Ligne</div>
            <div className="text-3xl font-bold text-green-500">{onlineServers}</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="text-gray-400 text-sm mb-1">Total USD/mois</div>
            <div className="text-3xl font-bold text-white">${totalCostUSD.toFixed(2)}</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="text-gray-400 text-sm mb-1">Total EUR/mois</div>
            <div className="text-3xl font-bold text-white">€{totalCostEUR.toFixed(2)}</div>
          </div>
        </div>

        {/* Filters and Refresh */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <div className="text-gray-400 text-sm">
              Dernière mise à jour: {lastUpdate}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setFilterProvider('all')}
                className={`px-3 py-1 rounded-lg text-sm font-semibold transition-colors ${
                  filterProvider === 'all' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Tous
              </button>
              <button
                onClick={() => setFilterProvider('mvps')}
                className={`px-3 py-1 rounded-lg text-sm font-semibold transition-colors ${
                  filterProvider === 'mvps' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                MVPS
              </button>
              <button
                onClick={() => setFilterProvider('oneprovider')}
                className={`px-3 py-1 rounded-lg text-sm font-semibold transition-colors ${
                  filterProvider === 'oneprovider' 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                OneProvider
              </button>
            </div>
          </div>
          <button
            onClick={() => {
              setLoading(true);
              fetchServers();
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
          >
            🔄 Actualiser
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-900/50 border border-red-500 rounded-lg p-4 mb-6">
            <p className="text-red-200">{error}</p>
          </div>
        )}

        {/* Server Grid */}
        {filteredServers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-fr">
            {filteredServers.map((server) => (
              <ServerCard key={server.id} server={server} />
            ))}
          </div>
        ) : (
          <div className="bg-gray-800 rounded-lg p-12 text-center border border-gray-700">
            <p className="text-gray-400 text-lg">Aucun serveur trouvé</p>
            <p className="text-gray-500 text-sm mt-2">
              Configurez vos clés API dans le fichier .env.local
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
