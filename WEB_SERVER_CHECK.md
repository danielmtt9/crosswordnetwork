# Web Server Configuration Check for Hostinger

## Commands to Run (when SSH is available)

### 1. Check which web server is installed
```bash
which apache2 httpd nginx
ps aux | grep -E '(apache|httpd|nginx)' | grep -v grep
```

### 2. Check web server configuration directories
```bash
ls -la /etc/nginx 2>/dev/null && echo "nginx config exists"
ls -la /etc/apache2 2>/dev/null && echo "apache2 config exists"
ls -la /etc/httpd 2>/dev/null && echo "httpd config exists"
```

### 3. Check what's serving the site
```bash
curl -I http://localhost
curl -I https://crossword.network
```

## Typical Hostinger Shared Hosting Setup

On Hostinger shared hosting:
- **Apache** is typically the web server (serves static files and PHP)
- **nginx** is usually NOT available (requires root access)
- You typically **cannot** install or configure nginx yourself
- You have limited control over Apache configuration

## Options for Node.js on Shared Hosting

### Option 1: Use Apache with mod_proxy (Current Issue)
- Requires Hostinger to enable `mod_proxy` and `mod_proxy_http`
- This is what we've been trying with `.htaccess`
- **Status**: Blocked (403 Forbidden)

### Option 2: Run Node.js on a Different Port
Some shared hosts allow Node.js apps on specific ports:
- Check if Hostinger has a Node.js application feature
- May need to access via `https://crossword.network:3000` (if allowed)
- Or configure a subdomain to point to the Node.js port

### Option 3: Use PHP Proxy (Workaround)
- Create a PHP script that proxies requests to Node.js
- Works if PHP is enabled (usually is on shared hosting)
- File: `proxy.php` (already created)
- `.htaccess` routes all requests through PHP proxy

### Option 4: Upgrade to VPS/Cloud
- Full control over web server (nginx or Apache)
- Can configure reverse proxy yourself
- More expensive but full flexibility

## Recommended Next Steps

1. **Check Hostinger Documentation**
   - Look for "Node.js" or "Application Hosting" features
   - Check if they have a Node.js application manager

2. **Contact Hostinger Support**
   - Ask: "Do you support Node.js applications?"
   - Ask: "Can you enable Apache mod_proxy for my domain?"
   - Ask: "Is there a Node.js hosting feature I should use?"

3. **Try PHP Proxy Workaround**
   - Upload `proxy.php` to `public_html/`
   - Update `.htaccess` to route through PHP
   - This may work if mod_proxy is disabled but PHP is enabled

4. **Check for Alternative Access**
   - Try accessing directly: `http://your-server-ip:3000`
   - Check if Hostinger allows direct port access
   - May need firewall/security group configuration

## Current Status

- ✅ Node.js app is built and ready
- ✅ PM2 is running the app on port 3000
- ✅ App is listening on 0.0.0.0:3000
- ❌ Apache mod_proxy is blocked (403 Forbidden)
- ❓ Need to check if nginx is available (unlikely on shared hosting)

## Commands to Check Web Server

When SSH is working, run these to diagnose:

```bash
# Check web server process
ps aux | grep -E '(apache|httpd|nginx)'

# Check if nginx is installed
which nginx
nginx -v 2>&1

# Check Apache version
apache2 -v 2>&1 || httpd -v 2>&1

# Check what's listening on port 80/443
netstat -tlnp | grep -E ':(80|443)' || ss -tlnp | grep -E ':(80|443)'

# Check domain directory structure
ls -la ~/domains/crossword.network/
```


