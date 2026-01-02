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
  const [filterProvider, setFilterProvider] = useState<'all' | 'mvps' | 'oneprovider' | 'online' | 'offline'>('all');
  const [filterVPN, setFilterVPN] = useState<'all' | 'premium' | 'free' | 'unavailable' | 'difference' | 'bandwidth95' | 'duplicates'>('all');
  const [sortBy, setSortBy] = useState<'none' | 'bandwidth-gb' | 'bandwidth-percent' | 'renewal'>('none');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [pendingChanges, setPendingChanges] = useState<Map<string, {platform: 'ios' | 'android', status: string, refPath?: string}>>(new Map());
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

  const updateVPNConfig = (serverIp: string, platform: 'ios' | 'android', newStatus: string, refPath?: string) => {
    // Trouver le serveur original (depuis localStorage pour avoir la vraie valeur initiale)
    const savedServers = localStorage.getItem('dashboardServers');
    const originalServers: Server[] = savedServers ? JSON.parse(savedServers) : servers;
    const originalServer = originalServers.find(s => s.ip === serverIp);
    
    if (!originalServer?.vpnConfig) return;
    
    const originalConfig = platform === 'ios'
      ? (refPath && originalServer.vpnConfig.iosMultiple ? originalServer.vpnConfig.iosMultiple.find((e: any) => e.refPath === refPath) : originalServer.vpnConfig.ios)
      : (refPath && originalServer.vpnConfig.androidMultiple ? originalServer.vpnConfig.androidMultiple.find((e: any) => e.refPath === refPath) : originalServer.vpnConfig.android);
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
        const updatedIos = {
          ...updatedServer.vpnConfig.ios,
          available: newStatus !== 'indisponible',
          isPremium: newStatus === 'premium',
        };

        let iosMultiple = updatedServer.vpnConfig.iosMultiple;
        if (refPath && iosMultiple) {
          iosMultiple = iosMultiple.map(entry => (
            entry.refPath === refPath
              ? { ...entry, available: newStatus !== 'indisponible', isPremium: newStatus === 'premium' }
              : entry
          ));
        }

        updatedServer.vpnConfig = {
          ...updatedServer.vpnConfig,
          ios: refPath && iosMultiple ? iosMultiple.find(e => e.refPath === refPath) || updatedIos : updatedIos,
          iosMultiple,
        };
      } else if (platform === 'android' && updatedServer.vpnConfig.android) {
        const updatedAndroid = {
          ...updatedServer.vpnConfig.android,
          available: newStatus !== 'indisponible',
          isPremium: newStatus === 'premium',
        };

        let androidMultiple = updatedServer.vpnConfig.androidMultiple;
        if (refPath && androidMultiple) {
          androidMultiple = androidMultiple.map(entry => (
            entry.refPath === refPath
              ? { ...entry, available: newStatus !== 'indisponible', isPremium: newStatus === 'premium' }
              : entry
          ));
        }

        updatedServer.vpnConfig = {
          ...updatedServer.vpnConfig,
          android: refPath && androidMultiple ? androidMultiple.find(e => e.refPath === refPath) || updatedAndroid : updatedAndroid,
          androidMultiple,
        };
      }
      
      return updatedServer;
    }));
    
    // Gérer les pendingChanges
    setPendingChanges(prev => {
      const newChanges = new Map(prev);
      const key = `${serverIp}-${platform}-${refPath || 'default'}`;
      
      // Si on revient à la valeur originale, supprimer le changement en attente
      if (originalStatus === newStatus) {
        newChanges.delete(key);
      } else {
        // Sinon, ajouter/mettre à jour le changement
        newChanges.set(key, { platform, status: newStatus, refPath });
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
        const [serverIp] = key.split('-');
        await fetch('/api/config/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ serverIp, platform: change.platform, status: change.status, refPath: change.refPath }),
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
    let filtered = servers;
    
    // Appliquer le filtre provider/status
    if (filterProvider === 'mvps') {
      filtered = filtered.filter(s => s.provider === 'mvps');
    } else if (filterProvider === 'oneprovider') {
      filtered = filtered.filter(s => s.provider === 'oneprovider');
    } else if (filterProvider === 'online') {
      filtered = filtered.filter(s => s.status === 'online');
    } else if (filterProvider === 'offline') {
      filtered = filtered.filter(s => s.status === 'offline');
    }
    
    // Filtres VPN et bande passante
    if (filterVPN === 'all') return filtered;
    
    if (filterVPN === 'bandwidth95') {
      return filtered.filter(s => {
        // Ignorer les serveurs avec bande passante illimitée
        if (s.bandwidth.total >= 999999999) return false;
        
        const usagePercent = (s.bandwidth.used / s.bandwidth.total) * 100;
        return usagePercent > 95;
      });
    }
    
    if (filterVPN === 'premium') return filtered.filter(s => {
      // Premium si au moins iOS OU Android est premium et disponible (inclure les doublons)
      const hasIosPremium = s.vpnConfig?.ios?.isPremium && s.vpnConfig.ios.available || 
                            s.vpnConfig?.iosMultiple?.some(e => e.isPremium && e.available);
      const hasAndroidPremium = s.vpnConfig?.android?.isPremium && s.vpnConfig.android.available || 
                                s.vpnConfig?.androidMultiple?.some(e => e.isPremium && e.available);
      return hasIosPremium || hasAndroidPremium;
    });
    
    if (filterVPN === 'free') return filtered.filter(s => {
      // Gratuit si au moins iOS OU Android est gratuit (non premium) et disponible (inclure les doublons)
      const hasIosFree = (s.vpnConfig?.ios && !s.vpnConfig.ios.isPremium && s.vpnConfig.ios.available) || 
                         s.vpnConfig?.iosMultiple?.some(e => !e.isPremium && e.available);
      const hasAndroidFree = (s.vpnConfig?.android && !s.vpnConfig.android.isPremium && s.vpnConfig.android.available) || 
                             s.vpnConfig?.androidMultiple?.some(e => !e.isPremium && e.available);
      return hasIosFree || hasAndroidFree;
    });
    
    if (filterVPN === 'unavailable') return filtered.filter(s => {
      // Indisponible si au moins iOS OU Android est indisponible (inclure les doublons)
      const hasIosUnavailable = (s.vpnConfig?.ios && !s.vpnConfig.ios.available) ||
                                s.vpnConfig?.iosMultiple?.some(e => !e.available);
      const hasAndroidUnavailable = (s.vpnConfig?.android && !s.vpnConfig.android.available) ||
                                    s.vpnConfig?.androidMultiple?.some(e => !e.available);
      return hasIosUnavailable || hasAndroidUnavailable;
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
    
    if (filterVPN === 'duplicates') {
      // Doublons: serveurs avec plus d'une entrée iOS OU plus d'une entrée Android (vrais doublons)
      return filtered.filter(s => {
        const hasMultipleIos = (s.vpnConfig?.iosMultiple?.length ?? 0) > 1;
        const hasMultipleAndroid = (s.vpnConfig?.androidMultiple?.length ?? 0) > 1;
        return hasMultipleIos || hasMultipleAndroid;
      });
    }
    
    return filtered;
  })();

  // Appliquer le tri
  const sortedServers = (() => {
    if (sortBy === 'none') return filteredServers;
    
    const sorted = [...filteredServers].sort((a, b) => {
      if (sortBy === 'bandwidth-gb') {
        // Ignorer les serveurs avec bande passante illimitée pour le tri
        const aIsUnlimited = a.bandwidth.total >= 999999999;
        const bIsUnlimited = b.bandwidth.total >= 999999999;
        
        if (aIsUnlimited && bIsUnlimited) return 0;
        if (aIsUnlimited) return 1; // Les illimités à la fin
        if (bIsUnlimited) return -1;
        
        const aUsed = a.bandwidth.used;
        const bUsed = b.bandwidth.used;
        return sortOrder === 'asc' ? aUsed - bUsed : bUsed - aUsed;
      }
      
      if (sortBy === 'bandwidth-percent') {
        // Tri par pourcentage de bande passante utilisée
        const aIsUnlimited = a.bandwidth.total >= 999999999;
        const bIsUnlimited = b.bandwidth.total >= 999999999;
        
        if (aIsUnlimited && bIsUnlimited) return 0;
        if (aIsUnlimited) return 1; // Les illimités à la fin
        if (bIsUnlimited) return -1;
        
        const aPercent = (a.bandwidth.used / a.bandwidth.total) * 100;
        const bPercent = (b.bandwidth.used / b.bandwidth.total) * 100;
        return sortOrder === 'asc' ? aPercent - bPercent : bPercent - aPercent;
      }
      
      if (sortBy === 'renewal') {
        // Tri par date de renouvellement (MVPS uniquement)
        if (!a.renewalDate && !b.renewalDate) return 0;
        if (!a.renewalDate) return 1; // Pas de date à la fin
        if (!b.renewalDate) return -1;
        
        // Convertir les dates DD/MM/YYYY en timestamps
        const parseDate = (dateStr: string) => {
          const [day, month, year] = dateStr.split('/');
          return new Date(`${year}-${month}-${day}`).getTime();
        };
        
        const aTime = parseDate(a.renewalDate);
        const bTime = parseDate(b.renewalDate);
        return sortOrder === 'asc' ? aTime - bTime : bTime - aTime;
      }
      
      return 0;
    });
    
    return sorted;
  })();

  // Calculer les coûts (pas de déduplication nécessaire maintenant)
  const totalCostUSD = sortedServers
    .filter(s => s.currency === 'USD')
    .reduce((sum, server) => sum + server.price, 0);
  
  const totalCostEUR = sortedServers
    .filter(s => s.currency === 'EUR')
    .reduce((sum, server) => sum + server.price, 0);
  
  // Taux de change USD vers EUR (approximatif : 1 USD = 0.92 EUR)
  const USD_TO_EUR_RATE = 0.92;
  const totalCostUSDInEUR = totalCostUSD * USD_TO_EUR_RATE;
  const grandTotalEUR = totalCostEUR + totalCostUSDInEUR;
  
  const onlineServers = sortedServers.filter(s => s.status === 'online').length;

  // Stats VPN
  const vpnStats = {
    premium: sortedServers.filter(s => 
      (s.vpnConfig?.ios?.isPremium && s.vpnConfig.ios.available) || 
      (s.vpnConfig?.android?.isPremium && s.vpnConfig.android.available)
    ).length,
    free: sortedServers.filter(s => 
      (s.vpnConfig?.ios && !s.vpnConfig.ios.isPremium && s.vpnConfig.ios.available) || 
      (s.vpnConfig?.android && !s.vpnConfig.android.isPremium && s.vpnConfig.android.available)
    ).length,
    unavailable: sortedServers.filter(s =>
      (s.vpnConfig?.ios && !s.vpnConfig.ios.available) ||
      (s.vpnConfig?.android && !s.vpnConfig.android.available)
    ).length,
  };

  // Stats pour les filtres
  const filterStats = {
    all: servers.length,
    mvps: servers.filter(s => s.provider === 'mvps').length,
    oneprovider: servers.filter(s => s.provider === 'oneprovider').length,
    online: servers.filter(s => s.status === 'online').length,
    offline: servers.filter(s => s.status === 'offline').length,
    premium: servers.filter(s => {
      const hasIosPremium = s.vpnConfig?.ios?.isPremium && s.vpnConfig.ios.available || 
                            s.vpnConfig?.iosMultiple?.some(e => e.isPremium && e.available);
      const hasAndroidPremium = s.vpnConfig?.android?.isPremium && s.vpnConfig.android.available || 
                                s.vpnConfig?.androidMultiple?.some(e => e.isPremium && e.available);
      return hasIosPremium || hasAndroidPremium;
    }).length,
    free: servers.filter(s => {
      const hasIosFree = (s.vpnConfig?.ios && !s.vpnConfig.ios.isPremium && s.vpnConfig.ios.available) || 
                         s.vpnConfig?.iosMultiple?.some(e => !e.isPremium && e.available);
      const hasAndroidFree = (s.vpnConfig?.android && !s.vpnConfig.android.isPremium && s.vpnConfig.android.available) || 
                             s.vpnConfig?.androidMultiple?.some(e => !e.isPremium && e.available);
      return hasIosFree || hasAndroidFree;
    }).length,
    unavailable: servers.filter(s => {
      const hasIosUnavailable = (s.vpnConfig?.ios && !s.vpnConfig.ios.available) ||
                                s.vpnConfig?.iosMultiple?.some(e => !e.available);
      const hasAndroidUnavailable = (s.vpnConfig?.android && !s.vpnConfig.android.available) ||
                                    s.vpnConfig?.androidMultiple?.some(e => !e.available);
      return hasIosUnavailable || hasAndroidUnavailable;
    }).length,
    difference: servers.filter(s => {
      const ios = s.vpnConfig?.ios;
      const android = s.vpnConfig?.android;
      if (ios && android) {
        if (!ios.available && !android.available) return false;
        return ios.isPremium !== android.isPremium || ios.available !== android.available;
      }
      return (ios && !android) || (!ios && android);
    }).length,
    duplicates: servers.filter(s => {
      const hasMultipleIos = (s.vpnConfig?.iosMultiple?.length ?? 0) > 1;
      const hasMultipleAndroid = (s.vpnConfig?.androidMultiple?.length ?? 0) > 1;
      return hasMultipleIos || hasMultipleAndroid;
    }).length,
    bandwidth95: servers.filter(s => {
      if (s.bandwidth.total >= 999999999) return false;
      const usagePercent = (s.bandwidth.used / s.bandwidth.total) * 100;
      return usagePercent > 95;
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
        <div className="mb-8 flex justify-between items-start">
          <div>
            <div className="flex items-center gap-4 mb-2">
              <h1 className="text-4xl font-bold text-white">Tableau de Bord Serveurs</h1>
              {lastUpdate && (
                <div className="text-sm text-gray-400">
                  Dernière mise à jour: <span className="text-white font-semibold">{lastUpdate}</span>
                </div>
              )}
            </div>
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
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
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
            <div className="text-2xl font-bold text-white">${totalCostUSD.toFixed(2)}</div>
            <div className="text-xs text-gray-500 mt-1">≈ €{totalCostUSDInEUR.toFixed(2)}</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="text-gray-400 text-sm mb-1">Total EUR/mois</div>
            <div className="text-2xl font-bold text-white">€{totalCostEUR.toFixed(2)}</div>
          </div>
          <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg p-6 border border-blue-500">
            <div className="text-blue-100 text-sm mb-1 font-semibold">GRAND TOTAL EUR/mois</div>
            <div className="text-3xl font-bold text-white">€{grandTotalEUR.toFixed(2)}</div>
            <div className="text-xs text-blue-200 mt-1">1 USD = {USD_TO_EUR_RATE} EUR</div>
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
          {/* Row 1: Provider filters + Tri */}
          <div className="flex items-center justify-between">
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
                <button
                  onClick={() => setFilterProvider('online')}
                  className={`px-3 py-1 rounded-lg text-sm font-semibold transition-colors ${
                    filterProvider === 'online' 
                      ? 'bg-green-600 text-white' 
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  Online ({filterStats.online})
                </button>
                <button
                  onClick={() => setFilterProvider('offline')}
                  className={`px-3 py-1 rounded-lg text-sm font-semibold transition-colors ${
                    filterProvider === 'offline' 
                      ? 'bg-red-600 text-white' 
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  Offline ({filterStats.offline})
                </button>
            </div>
            {/* Tri à droite */}
            <div className="flex gap-2 items-center">
              <span className="text-gray-400 text-sm">Trier par:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'none' | 'bandwidth-gb' | 'bandwidth-percent' | 'renewal')}
                className="bg-gray-700 text-white text-sm px-3 py-1 rounded-lg border border-gray-600 focus:outline-none focus:border-blue-500"
              >
                <option value="none">Aucun tri</option>
                <option value="bandwidth-gb">Bande passante (GB)</option>
                <option value="bandwidth-percent">Bande passante (%)</option>
                <option value="renewal">Date de renouvellement</option>
              </select>
              {sortBy !== 'none' && (
                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="bg-gray-700 hover:bg-gray-600 text-white text-sm px-3 py-1 rounded-lg transition-colors"
                >
                  {sortOrder === 'asc' ? '↑ Croissant' : '↓ Décroissant'}
                </button>
              )}
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
              onClick={() => setFilterVPN('duplicates')}
              className={`px-3 py-1 rounded-lg text-sm font-semibold transition-colors ${
                filterVPN === 'duplicates' 
                  ? 'bg-indigo-500 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Doublons ({filterStats.duplicates})
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
            <button
              onClick={() => setFilterVPN('bandwidth95')}
              className={`px-3 py-1 rounded-lg text-sm font-semibold transition-colors ${
                filterVPN === 'bandwidth95' 
                  ? 'bg-red-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              &gt; 95% ({filterStats.bandwidth95})
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
        {sortedServers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-fr">
            {sortedServers.map((server, index) => (
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
