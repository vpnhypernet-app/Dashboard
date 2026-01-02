#!/usr/bin/env node

/**
 * Script pour récupérer les serveurs MVPS et générer le fichier de documentation
 */

const fs = require('fs').promises;
const path = require('path');

const MVPS_API_KEY = 'rTW0TdqAfwjqLNwAhGScpX1TH26XJ2R2cdY9QDkFGTuQLDk79cJPJm9HuRi8oL8F6OXWYWQFvFFictJXOGKtpzR1hgfVnPV';
const MVPS_API_USER = 'admin@vpnhypernet.com';

async function fetchMVPSServers() {
  try {
    console.log('🔄 Récupération des serveurs MVPS...');
    
    // Étape 1: Récupérer la liste des serveurs
    const serversResponse = await fetch('https://www.mvps.net/api/vps/', {
      method: 'GET',
      headers: {
        'X_API_KEY': MVPS_API_KEY,
        'X_API_USER': MVPS_API_USER,
      },
    });

    if (!serversResponse.ok) {
      throw new Error(`API Error: ${serversResponse.status} ${serversResponse.statusText}`);
    }

    const serversData = await serversResponse.json();
    
    if (serversData.status !== 'ok' || !serversData.data) {
      throw new Error('Pas de données de serveurs disponibles');
    }

    console.log(`✅ ${serversData.data.length} serveurs trouvés`);

    // Étape 2: Récupérer les détails de chaque serveur
    const serversDetails = await Promise.all(
      serversData.data.map(async (server) => {
        try {
          const detailResponse = await fetch(`https://www.mvps.net/api/vps/${server.id}`, {
            method: 'GET',
            headers: {
              'X_API_KEY': MVPS_API_KEY,
              'X_API_USER': MVPS_API_USER,
            },
          });

          if (detailResponse.ok) {
            const detailData = await detailResponse.json();
            if (detailData.status === 'ok' && detailData.data) {
              return { ...server, ...detailData.data };
            }
          }
          return server;
        } catch (error) {
          console.warn(`Erreur pour serveur ${server.id}:`, error.message);
          return server;
        }
      })
    );

    return serversDetails;
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des serveurs:', error);
    throw error;
  }
}

async function generateMarkdownFile(servers) {
  let markdown = `# Serveurs MVPS - Dates de Renouvellement\n\n`;
  markdown += `*Dernière mise à jour: ${new Date().toLocaleString('fr-FR')}*\n\n`;
  markdown += `---\n\n`;

  servers.forEach((server, index) => {
    const name = server.label || `Serveur ${server.id}`;
    const description = server.os || 'N/A';
    const ip = Array.isArray(server.ips) ? server.ips[0] : server.ips || 'N/A';
    const renewalDate = server.expiration 
      ? new Date(server.expiration * 1000).toLocaleDateString('fr-FR')
      : 'N/A';
    
    // Améliorer la localisation
    const locationMap = {
      'UK': 'United Kingdom', 'IRL': 'Ireland', 'GR': 'Greece',
      'SE': 'Sweden', 'CY': 'Cyprus', 'ES': 'Spain',
      'FR': 'France', 'NL': 'Netherlands', 'DE': 'Germany',
    };
    
    const labelParts = (server.label || '').split('-');
    const countryCode = labelParts[0]?.trim() || '';
    const city = labelParts.slice(1).join('-').trim() || '';
    const countryName = locationMap[countryCode] || countryCode;
    const location = city ? `${countryName} - ${city}` : countryName;
    
    markdown += `## ${index + 1}. ${name}\n\n`;
    markdown += `- **Nom**: ${name}\n`;
    markdown += `- **Description**: ${description}\n`;
    markdown += `- **Localisation**: ${location}\n`;
    markdown += `- **Adresse IP**: ${ip}\n`;
    markdown += `- **Statut**: ${server.status || 'N/A'}\n`;
    markdown += `- **Date de renouvellement**: ${renewalDate}\n`;
    markdown += `- **ID MVPS**: ${server.id}\n`;
    markdown += `\n`;
  });

  return markdown;
}

async function main() {
  try {
    const servers = await fetchMVPSServers();
    const markdown = await generateMarkdownFile(servers);
    
    const outputPath = path.join(__dirname, '..', 'data', 'mvps-servers.md');
    await fs.writeFile(outputPath, markdown, 'utf-8');
    
    console.log(`✅ Fichier généré avec succès: ${outputPath}`);
    console.log(`📊 ${servers.length} serveurs documentés`);
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

main();
