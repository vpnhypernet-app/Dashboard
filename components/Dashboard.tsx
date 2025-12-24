'use client';

import { useEffect, useState } from 'react';
import ServerCard from './ServerCard';
import NotesBox from './NotesBox';
import { Server } from '@/types/server';

export default function Dashboard() {
  const [servers, setServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [filterProvider, setFilterProvider] = useState<'all' | 'mvps' | 'oneprovider'>('all');
  const [filterVPN, setFilterVPN] = useState<'all' | 'premium' | 'free' | 'unavailable' | 'difference'>('all');
  const [pendingChanges, setPendingChanges] = useState<Map<string, {platform: 'ios' | 'android', status: string}>>(new Map());
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const fetchServers = async () => {
    try {
      setError(null);
      const response = await fetch('/api/servers');
      const data = await response.json();

      if (data.success) {
        setServers(data.servers);
        setLastUpdate(new Date().toLocaleTimeString('fr-FR'));
        // Sauvegarder dans localStorage
        localStorage.setItem('dashboardServers', JSON.stringify(data.servers));
        localStorage.setItem('dashboardLastUpdate', new Date().toLocaleTimeString('fr-FR'));
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

  const updateVPNConfig = (serverIp: string, platform: 'ios' | 'android', newStatus: string) => {
    // Trouver le serveur original (depuis localStorage pour avoir la vraie valeur initiale)
    const savedServers = localStorage.getItem('dashboardServers');
    const originalServers: Server[] = savedServers ? JSON.parse(savedServers) : servers;
    const originalServer = originalServers.find(s => s.ip === serverIp);
    
    if (!originalServer?.vpnConfig) return;
    
    const originalConfig = platform === 'ios' ? originalServer.vpnConfig.ios : originalServer.vpnConfig.android;
    if (!originalConfig) return;
    
    // Construire le statut original
    let originalStatus = 'indisponible';
    if (originalConfig.available) {
      originalStatus = originalConfig.isPremium ? 'premium' : 'gratuit';
    }
    
    // Mettre à jour l'affichage immédiatement
    setServers(prevServers => prevServers.map(s => {
      if (s.ip !== serverIp) return s;
      
      const updatedServer = { ...s };
      if (!updatedServer.vpnConfig) return s;
      
      if (platform === 'ios' && updatedServer.vpnConfig.ios) {
        updatedServer.vpnConfig = {
          ...updatedServer.vpnConfig,
          ios: {
            ...updatedServer.vpnConfig.ios,
            available: newStatus !== 'indisponible',
            isPremium: newStatus === 'premium',
          },
        };
      } else if (platform === 'android' && updatedServer.vpnConfig.android) {
        updatedServer.vpnConfig = {
          ...updatedServer.vpnConfig,
          android: {
            ...updatedServer.vpnConfig.android,
            available: newStatus !== 'indisponible',
            isPremium: newStatus === 'premium',
          },
        };
      }
      
      return updatedServer;
    }));
    
    // Gérer les pendingChanges
    setPendingChanges(prev => {
      const newChanges = new Map(prev);
      const key = `${serverIp}-${platform}`;
      
      // Si on revient à la valeur originale, supprimer le changement en attente
      if (originalStatus === newStatus) {
        newChanges.delete(key);
      } else {
        // Sinon, ajouter/mettre à jour le changement
        newChanges.set(key, { platform, status: newStatus });
      }
      
      return newChanges;
    });
  };

  const refreshFirebaseOnly = async () => {
    try {
      setError(null);
      // Envoyer les serveurs actuels pour les enrichir avec Firebase uniquement
      const response = await fetch('/api/servers/refresh-firebase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ servers }),
      });
      const data = await response.json();

      if (data.success) {
        setServers(data.servers);
        setLastUpdate(new Date().toLocaleTimeString('fr-FR'));
        // Sauvegarder dans localStorage
        localStorage.setItem('dashboardServers', JSON.stringify(data.servers));
        localStorage.setItem('dashboardLastUpdate', new Date().toLocaleTimeString('fr-FR'));
      } else {
        setError(data.error || 'Failed to refresh Firebase config');
      }
    } catch (err) {
      setError('Network error occurred');
      console.error(err);
    }
  };

  const saveChanges = async () => {
    try {
      setShowConfirmModal(false);
      setLoading(true);
      
      // Envoyer chaque modification
      for (const [key, change] of pendingChanges.entries()) {
        const serverIp = key.split('-')[0];
        await fetch('/api/config/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ serverIp, platform: change.platform, status: change.status }),
        });
      }
      
      setPendingChanges(new Map());
      // Recharger seulement Firebase (pas les API OneProvider/MVPS)
      await refreshFirebaseOnly();
    } catch (err) {
      setError('Erreur lors de la sauvegarde');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Charger depuis localStorage au démarrage
    const savedServers = localStorage.getItem('dashboardServers');
    const savedLastUpdate = localStorage.getItem('dashboardLastUpdate');
    
    if (savedServers) {
      setServers(JSON.parse(savedServers));
      setLastUpdate(savedLastUpdate || '');
      setLoading(false);
    } else {
      fetchServers();
    }
  }, []);

  const filteredServers = (() => {
    let filtered = filterProvider === 'all' 
      ? servers 
      : servers.filter(s => s.provider === filterProvider);
    
    // Filtres VPN
    if (filterVPN === 'all') return filtered;
    
    if (filterVPN === 'premium') return filtered.filter(s => {
      // Premium si au moins iOS OU Android est premium et disponible
      return (s.vpnConfig?.ios?.isPremium && s.vpnConfig.ios.available) || 
             (s.vpnConfig?.android?.isPremium && s.vpnConfig.android.available);
    });
    
    if (filterVPN === 'free') return filtered.filter(s => {
      // Gratuit si au moins iOS OU Android est gratuit (non premium) et disponible
      return (s.vpnConfig?.ios && !s.vpnConfig.ios.isPremium && s.vpnConfig.ios.available) || 
             (s.vpnConfig?.android && !s.vpnConfig.android.isPremium && s.vpnConfig.android.available);
    });
    
    if (filterVPN === 'unavailable') return filtered.filter(s => {
      // Indisponible si au moins iOS OU Android est indisponible
      return (s.vpnConfig?.ios && !s.vpnConfig.ios.available) ||
             (s.vpnConfig?.android && !s.vpnConfig.android.available);
    });
    
    if (filterVPN === 'difference') {
      // Différences si iOS et Android ont des statuts différents
      return filtered.filter(s => {
        const ios = s.vpnConfig?.ios;
        const android = s.vpnConfig?.android;
        
        // Si les deux existent, vérifier les différences
        if (ios && android) {
          // Si les deux sont indisponibles, pas de différence à signaler
          if (!ios.available && !android.available) {
            return false;
          }
          // Vérifier les différences de statut
          return ios.isPremium !== android.isPremium || 
                 ios.available !== android.available;
        }
        // Si seulement un des deux existe
        return (ios && !android) || (!ios && android);
      });
    }
    
    return filtered;
  })();

  // Calculer les coûts (pas de déduplication nécessaire maintenant)
  const totalCostUSD = filteredServers
    .filter(s => s.currency === 'USD')
    .reduce((sum, server) => sum + server.price, 0);
  
  const totalCostEUR = filteredServers
    .filter(s => s.currency === 'EUR')
    .reduce((sum, server) => sum + server.price, 0);
  
  const onlineServers = filteredServers.filter(s => s.status === 'online').length;

  // Stats VPN
  const vpnStats = {
    premium: filteredServers.filter(s => 
      (s.vpnConfig?.ios?.isPremium && s.vpnConfig.ios.available) || 
      (s.vpnConfig?.android?.isPremium && s.vpnConfig.android.available)
    ).length,
    free: filteredServers.filter(s => 
      (s.vpnConfig?.ios && !s.vpnConfig.ios.isPremium && s.vpnConfig.ios.available) || 
      (s.vpnConfig?.android && !s.vpnConfig.android.isPremium && s.vpnConfig.android.available)
    ).length,
    unavailable: filteredServers.filter(s => 
      (s.vpnConfig?.ios && !s.vpnConfig.ios.available) ||
      (s.vpnConfig?.android && !s.vpnConfig.android.available)
    ).length,
  };

  // Stats pour les filtres
  const filterStats = {
    all: servers.length,
    mvps: servers.filter(s => s.provider === 'mvps').length,
    oneprovider: servers.filter(s => s.provider === 'oneprovider').length,
    premium: servers.filter(s => 
      (s.vpnConfig?.ios?.isPremium && s.vpnConfig.ios.available) || 
      (s.vpnConfig?.android?.isPremium && s.vpnConfig.android.available)
    ).length,
    free: servers.filter(s => 
      (s.vpnConfig?.ios && !s.vpnConfig.ios.isPremium && s.vpnConfig.ios.available) || 
      (s.vpnConfig?.android && !s.vpnConfig.android.isPremium && s.vpnConfig.android.available)
    ).length,
    unavailable: servers.filter(s => 
      (s.vpnConfig?.ios && !s.vpnConfig.ios.available) ||
      (s.vpnConfig?.android && !s.vpnConfig.android.available)
    ).length,
    difference: servers.filter(s => {
      const ios = s.vpnConfig?.ios;
      const android = s.vpnConfig?.android;
      if (ios && android) {
        if (!ios.available && !android.available) return false;
        return ios.isPremium !== android.isPremium || ios.available !== android.available;
      }
      return (ios && !android) || (!ios && android);
    }).length,
  };


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
        {/* Modal de confirmation */}
        {showConfirmModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 max-w-2xl border border-gray-700">
              <h3 className="text-xl font-bold text-white mb-4">Confirmer les modifications</h3>
              <p className="text-gray-300 mb-4">
                Vous avez {pendingChanges.size} modification(s) en attente :
              </p>
              
              {/* Liste des changements */}
              <div className="bg-gray-900/50 rounded-lg p-4 mb-6 max-h-96 overflow-y-auto">
                {Array.from(pendingChanges.entries()).map(([key, change]) => {
                  const serverIp = key.split('-')[0];
                  const server = servers.find(s => s.ip === serverIp);
                  const platformIcon = change.platform === 'ios' ? '🍎' : '🤖';
                  const statusIcon = change.status === 'premium' ? '⭐' : change.status === 'gratuit' ? '✓' : '🚫';
                  const statusText = change.status === 'premium' ? 'Premium' : change.status === 'gratuit' ? 'Gratuit' : 'Indisponible';
                  const statusColor = change.status === 'premium' ? 'text-yellow-400' : change.status === 'gratuit' ? 'text-green-400' : 'text-red-400';
                  
                  return (
                    <div key={key} className="flex items-center justify-between py-2 border-b border-gray-700 last:border-b-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono text-gray-400">{serverIp}</span>
                        <span className="text-xs text-gray-500">({server?.name || 'Serveur'})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{platformIcon} {change.platform.toUpperCase()}</span>
                        <span className="text-lg">→</span>
                        <span className={`text-sm font-semibold ${statusColor}`}>{statusIcon} {statusText}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={saveChanges}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                >
                  Confirmer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Tableau de Bord Serveurs</h1>
            <p className="text-gray-400">Surveillance de vos serveurs MVPS et OneProvider</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => {
                setLoading(true);
                fetchServers();
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg text-base font-semibold transition-colors"
            >
              🔄 Actualiser
            </button>
            {pendingChanges.size > 0 && (
              <button
                onClick={() => setShowConfirmModal(true)}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-all animate-pulse"
              >
                💾 Sauvegarder ({pendingChanges.size})
              </button>
            )}
          </div>
        </div>

        {/* Notes importantes */}
        <div className="mb-8">
          <NotesBox />
        </div>

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

        {/* VPN Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="text-gray-400 text-xs mb-1">Premium</div>
            <div className="text-2xl font-bold text-yellow-400">{vpnStats.premium}</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="text-gray-400 text-xs mb-1">Gratuit</div>
            <div className="text-2xl font-bold text-purple-400">{vpnStats.free}</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="text-gray-400 text-xs mb-1">Indisponible</div>
            <div className="text-2xl font-bold text-red-400">{vpnStats.unavailable}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 mb-6">
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
                  Tous ({filterStats.all})
                </button>
                <button
                  onClick={() => setFilterProvider('mvps')}
                  className={`px-3 py-1 rounded-lg text-sm font-semibold transition-colors ${
                    filterProvider === 'mvps' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  MVPS ({filterStats.mvps})
                </button>
                <button
                  onClick={() => setFilterProvider('oneprovider')}
                  className={`px-3 py-1 rounded-lg text-sm font-semibold transition-colors ${
                    filterProvider === 'oneprovider' 
                      ? 'bg-purple-600 text-white' 
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  OneProvider ({filterStats.oneprovider})
                </button>
            </div>
          </div>

          {/* Filtres VPN */}
          <div className="flex gap-2">
            <button
              onClick={() => setFilterVPN('all')}
              className={`px-3 py-1 rounded-lg text-sm font-semibold transition-colors ${
                filterVPN === 'all' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Tous ({filterStats.all})
            </button>
            <button
              onClick={() => setFilterVPN('premium')}
              className={`px-3 py-1 rounded-lg text-sm font-semibold transition-colors ${
                filterVPN === 'premium' 
                  ? 'bg-yellow-500 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Premium ({filterStats.premium})
            </button>
            <button
              onClick={() => setFilterVPN('free')}
              className={`px-3 py-1 rounded-lg text-sm font-semibold transition-colors ${
                filterVPN === 'free' 
                  ? 'bg-purple-500 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Gratuit ({filterStats.free})
            </button>
            <button
              onClick={() => setFilterVPN('unavailable')}
              className={`px-3 py-1 rounded-lg text-sm font-semibold transition-colors ${
                filterVPN === 'unavailable' 
                  ? 'bg-red-500 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Indisponible ({filterStats.unavailable})
            </button>
            <button
              onClick={() => setFilterVPN('difference')}
              className={`px-3 py-1 rounded-lg text-sm font-semibold transition-colors ${
                filterVPN === 'difference' 
                  ? 'bg-orange-500 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Différences ({filterStats.difference})
            </button>
          </div>
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
            {filteredServers.map((server, index) => (
              <ServerCard 
                key={`${server.id}-${index}`} 
                server={server} 
                onVPNConfigChange={updateVPNConfig}
              />
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
