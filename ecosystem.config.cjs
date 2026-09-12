module.exports = { apps: [{ name: 'API-JHCIS', script: './server.js' }, { name: 'CF-Tunnel', script: 'cloudflared', args: 'tunnel run JHCIS-MiniHealth-Server' }] };
