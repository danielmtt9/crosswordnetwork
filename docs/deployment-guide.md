# Deployment Guide

## Infrastructure
- **Server**: Node.js environment (e.g., VPS, Hostinger)
- **Database**: MySQL
- **Process Manager**: PM2

## Deployment Artifacts
The `deploy-package/` directory contains deployment scripts and configurations.

## PM2 Configuration
Configuration is located in `ecosystem.config.js` (or `deploy-package/ecosystem.config.js`).

- **App Name**: `crossword-network`
- **Script**: `server.js`
- **Mode**: Fork (1 instance)
- **Environment**: Production (PORT 3000)
- **Logs**: `./logs/out.log` and `./logs/err.log`

## Deployment Process
1. Build the application: `npm run build`
2. Ensure `server.js` and `.next/` are present.
3. Start with PM2: `pm2 start ecosystem.config.js`

## Environment Variables
Ensure production `.env` is configured on the server with:
- `NODE_ENV=production`
- `PORT=3000`
- Database credentials
