# Network Access Setup Guide

## Flexible Multi-Computer Testing

The server now automatically detects the request origin and uses it for OAuth redirects. This means you can access the app from any computer on your network.

## Google OAuth Configuration

Since Google OAuth doesn't support wildcards, you need to add each IP address you'll use for testing:

1. Go to: https://console.cloud.google.com/apis/credentials
2. Edit your OAuth 2.0 Client ID
3. Under "Authorized redirect URIs", add:
   - `http://localhost:3004/api/auth/callback/google` (for local dev)
   - `http://10.0.0.53:3004/api/auth/callback/google` (your current IP)
   - `http://10.0.0.XX:3004/api/auth/callback/google` (add other test IPs as needed)
   - `http://192.168.X.X:3004/api/auth/callback/google` (if using different subnet)

## How It Works

- The server detects the `Host` header from incoming requests
- NextAuth uses this to construct OAuth callback URLs dynamically
- CORS allows any local network IP (10.x.x.x, 192.168.x.x, 172.16-31.x.x)
- No code changes needed when switching between test computers

## Finding Your IP Addresses

On the server machine:
```bash
hostname -I  # Shows all IP addresses
ip addr      # Detailed network info
```

On test computers, access via: `http://<server-ip>:3004`

## Notes

- Each IP you want to test from must be added to Google Console
- The server automatically handles the redirect URL based on which IP accessed it
- Works with localhost, local network IPs, and any IP in private ranges
