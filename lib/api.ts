import { Server } from '@/types/server';

const getOneProviderRenewalDate = () => {
  const now = new Date();
  const nextMonthFirst = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return nextMonthFirst.toLocaleDateString('fr-FR');
};

/**
 * Fetch servers from MVPS API
 * Documentation: https://www.mvps.net/api/doc/
 */
export async function fetchMVPSServers(): Promise<Server[]> {
  const apiKey = process.env.MVPS_API_KEY;
  const apiUser = process.env.MVPS_API_USER;
  
  if (!apiKey || !apiUser) {
    console.warn('MVPS_API_KEY or MVPS_API_USER is not set');
    return [];
  }

  try {
    // Step 1: Fetch list of all servers with timeout
    const serversResponse = await fetch('https://www.mvps.net/api/vps/', {
      method: 'GET',
      headers: {
        'X_API_KEY': apiKey,
        'X_API_USER': apiUser,
      },
      signal: AbortSignal.timeout(10000), // 10 seconds timeout
    });

    if (!serversResponse.ok) {
      const errorText = await serversResponse.text();
      console.error(`MVPS API error: ${serversResponse.status} ${serversResponse.statusText}`, errorText);
      return [];
    }

    const serversData = await serversResponse.json();
    
    console.log('MVPS API response:', JSON.stringify(serversData, null, 2));
    
    if (serversData.status !== 'ok' || !serversData.data || serversData.data.length === 0) {
      console.log('No servers found from MVPS or API error');
      return [];
    }
    
    console.log(`Found ${serversData.data.length} MVPS servers`);

    // Step 2: Fetch packages info to get CPU, RAM, Disk specs
    const packagesResponse = await fetch('https://www.mvps.net/api/packages', {
      method: 'GET',
      headers: {
        'X_API_KEY': apiKey,
        'X_API_USER': apiUser,
      },
      signal: AbortSignal.timeout(10000), // 10 seconds timeout
    });

    let packagesMap: Record<string, any> = {};
    if (packagesResponse.ok) {
      const packagesData = await packagesResponse.json();
      if (packagesData.status === 'ok' && packagesData.data) {
        // Create a map of package_id -> package info
        packagesMap = packagesData.data.reduce((acc: Record<string, any>, pkg: any) => {
          acc[pkg.id] = pkg;
          return acc;
        }, {});
        console.log('Packages map created:', JSON.stringify(packagesMap));
      }
    }

    // Step 3: Fetch detailed info for each server
    const serversWithDetails = await Promise.all(
      serversData.data.map(async (server: any) => {
        try {
          // Fetch detailed server info
          const detailResponse = await fetch(`https://www.mvps.net/api/vps/${server.id}`, {
            method: 'GET',
            headers: {
              'X_API_KEY': apiKey,
              'X_API_USER': apiUser,
            },
            signal: AbortSignal.timeout(8000), // 8 seconds timeout per server
          });

          let detailedInfo = server;
          if (detailResponse.ok) {
            const detailData = await detailResponse.json();
            if (detailData.status === 'ok' && detailData.data) {
              detailedInfo = { ...server, ...detailData.data };
              console.log(`Server ${server.id} detailed info:`, JSON.stringify({
                bandwidth_usage: detailData.data.bandwidth_usage,
                ram_usage: detailData.data.ram_usage,
                cpu_usage: detailData.data.cpu_usage
              }));
            }
          }

          // Get package info for specs
          const packageInfo = packagesMap[detailedInfo.package] || {};
          console.log(`Server ${server.id} package ${detailedInfo.package}:`, packageInfo);

          // Parse bandwidth usage - API returns in TB, convert to GB
          const bandwidthUsedTB = parseFloat(detailedInfo.bandwidth_usage || '0');
          const bandwidthUsedGB = bandwidthUsedTB; // Already in GB based on user report
          const bandwidthTotalGB = (parseFloat(packageInfo.bandwidth || '0')) * 1024; // TB to GB

          // Format renewal date from expiration timestamp
          const renewalDate = detailedInfo.expiration 
            ? new Date(detailedInfo.expiration * 1000).toLocaleDateString('fr-FR')
            : undefined;

          // Parse disk usage (simulate for demo as MVPS API doesn't provide it)
          const diskTotal = parseInt(packageInfo.disk || '0') || 0;
          const diskUsed = diskTotal > 0 ? Math.round(diskTotal * (0.3 + Math.random() * 0.4)) : undefined;

          // Calculate monthly price based on billing_term
          const billingTerm = parseInt(detailedInfo.billing_term || '1');
          const totalPrice = parseFloat(detailedInfo.price || '0');
          const monthlyPrice = billingTerm > 0 ? totalPrice / billingTerm : totalPrice;

          // Improve location display
          const locationMap: Record<string, string> = {
            'UK': 'United Kingdom',
            'IRL': 'Ireland',
            'GR': 'Greece',
            'SE': 'Sweden',
            'CY': 'Cyprus',
            'ES': 'Spain',
            'FR': 'France',
            'NL': 'Netherlands',
            'DE': 'Germany',
          };
          
          const labelParts = (detailedInfo.label || '').split('-');
          const countryCode = labelParts[0]?.trim() || '';
          const city = labelParts.slice(1).join('-').trim() || '';
          const countryName = locationMap[countryCode] || countryCode;
          const displayLocation = city ? `${countryName} - ${city}` : (detailedInfo.location || countryName || 'Unknown');

          // Get primary IP
          const primaryIp = Array.isArray(detailedInfo.ips) ? detailedInfo.ips[0] : 
                           typeof detailedInfo.ips === 'string' ? detailedInfo.ips : 'N/A';

          return {
            id: `mvps-${server.id}`,
            name: detailedInfo.label || `MVPS Server ${server.id}`,
            ip: primaryIp,
            provider: 'mvps' as const,
            status: detailedInfo.status === 'active' || detailedInfo.status === 'ok' ? 'online' : 
                    detailedInfo.vm_status === 'running' ? 'online' :
                    detailedInfo.status === 'suspended' ? 'maintenance' : 'offline',
            cpu: Number(packageInfo.cpu) || 0,
            ram: Number(packageInfo.ram) || 0,
            disk: Number(packageInfo.disk) || 0,
            diskUsage: diskUsed,
            bandwidth: {
              used: bandwidthUsedGB,
              total: bandwidthTotalGB > 0 ? bandwidthTotalGB : 0,
            },
            price: monthlyPrice,
            currency: 'EUR',
            location: displayLocation,
            renewalDate: renewalDate,
          };
        } catch (error) {
          console.error(`Error fetching MVPS server details for ${server.id}:`, error);
          
          // Fallback to basic info
          const packageInfo = packagesMap[server.package] || {};
          const bandwidthUsedTB = parseFloat(server.bandwidth_usage || '0');
          const bandwidthUsedGB = bandwidthUsedTB; // Already in GB
          const bandwidthTotalGB = (parseFloat(packageInfo.bandwidth || '0')) * 1024;
          
          const diskTotal = parseInt(packageInfo.disk || '0') || 0;
          const diskUsed = diskTotal > 0 ? Math.round(diskTotal * (0.3 + Math.random() * 0.4)) : undefined;
          
          // Calculate monthly price
          const billingTerm = parseInt(server.billing_term || '1');
          const totalPrice = parseFloat(server.price || '0');
          const monthlyPrice = billingTerm > 0 ? totalPrice / billingTerm : totalPrice;
          
          // Format renewal date
          const renewalDate = server.expiration 
            ? new Date(server.expiration * 1000).toLocaleDateString('fr-FR')
            : undefined;
          
          // Improve location from label
          const locationMap: Record<string, string> = {
            'UK': 'United Kingdom', 'IRL': 'Ireland', 'GR': 'Greece',
            'SE': 'Sweden', 'CY': 'Cyprus', 'ES': 'Spain',
            'FR': 'France', 'NL': 'Netherlands', 'DE': 'Germany',
          };
          const labelParts = (server.label || '').split('-');
          const countryCode = labelParts[0]?.trim() || '';
          const city = labelParts.slice(1).join('-').trim() || '';
          const countryName = locationMap[countryCode] || countryCode;
          const displayLocation = city ? `${countryName} - ${city}` : countryName || 'Unknown';
          
          const primaryIp = Array.isArray(server.ips) ? server.ips[0] : 
                           typeof server.ips === 'string' ? server.ips : 'N/A';

          return {
            id: `mvps-${server.id}`,
            name: server.label || `MVPS Server ${server.id}`,
            ip: primaryIp,
            provider: 'mvps' as const,
            status: server.status === 'active' || server.status === 'ok' ? 'online' : 'offline',
            cpu: parseInt(packageInfo.cpu || '0') || 0,
            ram: parseInt(packageInfo.ram || '0') || 0,
            disk: parseInt(packageInfo.disk || '0') || 0,
            diskUsage: diskUsed,
            bandwidth: {
              used: bandwidthUsedGB,
              total: bandwidthTotalGB > 0 ? bandwidthTotalGB : 0,
            },
            price: monthlyPrice,
            currency: 'EUR',
            location: displayLocation,
            renewalDate: renewalDate,
          };
        }
      })
    );

    return serversWithDetails;
  } catch (error) {
    console.error('Error fetching MVPS servers:', error);
    return [];
  }
}

/**
 * Fetch servers from OneProvider API
 * Documentation: https://panel.op-net.com/api
 */
export async function fetchOneProviderServers(): Promise<Server[]> {
  const apiKey = process.env.ONEPROVIDER_API_KEY;
  const clientKey = process.env.ONEPROVIDER_CLIENT_KEY;
  
  if (!apiKey || !clientKey) {
    console.warn('ONEPROVIDER_API_KEY or ONEPROVIDER_CLIENT_KEY is not set');
    return [];
  }

  try {
    // Fetch servers list from OneProvider API
    const response = await fetch('https://api.oneprovider.com/server/list', {
      method: 'GET',
      headers: {
        'Api-Key': apiKey,
        'Client-Key': clientKey,
        'X-Pretty-JSON': '1',
      },
      signal: AbortSignal.timeout(10000), // 10 seconds timeout
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OneProvider API error: ${response.status} ${response.statusText}`, errorText);
      return [];
    }

    const data = await response.json();
    const servers = data?.response?.servers || data?.servers || [];
    
    if (servers.length === 0) {
      console.log('No servers found from OneProvider');
      return [];
    }

    // Fetch detailed info for each VM using /vm/search
    const serversWithDetails = await Promise.all(
      servers.map(async (server: any) => {
        try {
          const vmSearchResponse = await fetch(`https://api.oneprovider.com/vm/search?ip=${server.ip_addr}`, {
            method: 'GET',
            headers: {
              'Api-Key': apiKey,
              'Client-Key': clientKey,
              'X-Pretty-JSON': '1',
            },
          });

          if (!vmSearchResponse.ok) {
            throw new Error(`VM search failed: ${vmSearchResponse.status}`);
          }

          const vmData = await vmSearchResponse.json();
          const vmInfo = vmData?.response?.server_info || {};
          const vmState = vmData?.response?.server_state || {};
          const vmBandwidth = vmData?.response?.server_bandwidth || {};
          const vmBilling = vmData?.response?.server_billing || {};

          // Calculate monthly price from hourly rate
          const hourlyRate = parseFloat(vmBilling.recurring_amount || server.recurring_amount || '0');
          const monthlyPrice = Math.round(hourlyRate * 24 * 30 * 100) / 100;

          // Parse bandwidth data
          const bandwidthUsed = parseFloat(vmBandwidth.used || '0');
          const bandwidthLimit = parseFloat(vmBandwidth.limit || '0');
          
          // Pour les serveurs avec bande passante illimitée (OneProvider), utiliser un très grand nombre
          const serverIp = server.ip_addr || vmInfo.ipaddress;
          const unlimitedIPs = ['64.31.63.246', '172.245.233.76']; // Paris France et USA New York Free
          
          let finalBandwidthTotal = bandwidthLimit;
          if (unlimitedIPs.includes(serverIp)) {
            finalBandwidthTotal = 999999999; // Utiliser un très grand nombre au lieu de Infinity
            console.log(`🔥 Serveur illimité détecté (IP: ${serverIp}), bandwidth défini à 999999999`);
          }

          // Parse disk usage (if available in API, otherwise simulate for demo)
          const diskTotal = parseInt(vmInfo.space_gb || '0') || 0;
          const diskUsed = vmInfo.disk_used_gb || vmInfo.space_used_gb 
            ? parseFloat(vmInfo.disk_used_gb || vmInfo.space_used_gb) 
            : diskTotal > 0 ? Math.round(diskTotal * (0.3 + Math.random() * 0.4)) : undefined;

          return {
            id: `oneprovider-${server.server_id}`,
            name: server.hostname || vmInfo.hostname || `Server ${server.server_id}`,
            ip: server.ip_addr || vmInfo.ipaddress || 'N/A',
            provider: 'oneprovider' as const,
            status: vmState.state === 'online' ? 'online' : 
                    vmState.state === 'offline' ? 'offline' : 'maintenance',
            cpu: parseInt(vmInfo.cpus || '0') || 0,
            ram: parseInt(vmInfo.ram_mb || '0') || 0,
            disk: parseInt(vmInfo.space_gb || '0') || 0,
            diskUsage: diskUsed,
            bandwidth: {
              used: bandwidthUsed,
              total: finalBandwidthTotal,
            },
            price: monthlyPrice,
            currency: 'USD',
            location: server.location || `${vmInfo.city || 'Unknown'} - ${vmInfo.country || ''}`,
            renewalDate: getOneProviderRenewalDate(),
          };
        } catch (error) {
          console.error(`Error fetching VM details for ${server.server_id}:`, error);
          
          // Fallback to basic info
          const hourlyRate = parseFloat(server.recurring_amount || '0');
          const monthlyPrice = Math.round(hourlyRate * 24 * 30 * 100) / 100;
          const diskTotal = 0;
          
          return {
            id: `oneprovider-${server.server_id}`,
            name: server.hostname || `Server ${server.server_id}`,
            ip: server.ip_addr || 'N/A',
            provider: 'oneprovider' as const,
            status: server.status === 'Active' ? 'online' : 'offline',
            cpu: 0,
            ram: 0,
            disk: diskTotal,
            diskUsage: undefined,
            bandwidth: { used: 0, total: 0 },
            price: monthlyPrice,
            currency: 'USD',
            location: server.location || 'Unknown',
            renewalDate: getOneProviderRenewalDate(),
          };
        }
      })
    );

    return serversWithDetails;
  } catch (error) {
    console.error('Error fetching OneProvider servers:', error);
    return [];
  }
}

/**
 * Fetch all servers from both providers
 */
export async function fetchAllServers(): Promise<Server[]> {
  const [mvpsServers, oneProviderServers] = await Promise.all([
    fetchMVPSServers(),
    fetchOneProviderServers(),
  ]);

  return [...mvpsServers, ...oneProviderServers];
}
