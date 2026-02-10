# Using nginx Instead of Apache on Hostinger

## Reality Check: Shared Hosting Limitations

On **Hostinger shared hosting**, you typically:
- **Cannot** install nginx yourself (requires root access)
- **Cannot** change the web server (Apache is pre-configured)
- **Cannot** modify system-level web server configurations
- **Can only** use `.htaccess` files for Apache configuration

## What's Likely Available

Based on typical shared hosting setups:

### Apache (Most Likely)
- ✅ Installed and running
- ✅ Serving your domain
- ❌ `mod_proxy` disabled (causing 403 errors)
- ✅ `.htaccess` files work (but proxy directives blocked)

### nginx (Unlikely)
- ❌ Not installed (requires root access)
- ❌ Cannot install yourself
- ❌ Would need VPS/Cloud plan

## Options to Use nginx

### Option 1: Upgrade to VPS/Cloud Plan
If you upgrade to Hostinger VPS or Cloud:
- Full root access
- Can install and configure nginx
- Can set up reverse proxy yourself
- More control and flexibility

### Option 2: Use nginx on Different Server
- Deploy to a VPS that supports nginx
- Use services like DigitalOcean, Linode, AWS, etc.
- Full control over web server configuration

### Option 3: Check Hostinger Cloud Plans
Some hosting providers offer:
- Managed Node.js hosting
- Pre-configured nginx setups
- Application platforms (like Platform.sh, Heroku, etc.)

## Current Best Options (Without Upgrading)

### 1. PHP Proxy Workaround
Since Apache is serving the site but mod_proxy is disabled:
- Use PHP to proxy requests to Node.js
- PHP is typically enabled on shared hosting
- File: `proxy.php` (already created)
- Works around Apache limitations

### 2. Contact Hostinger Support
Ask them to:
- Enable `mod_proxy` for your domain
- Or provide Node.js application hosting
- Or confirm if nginx is available on your plan

### 3. Use Different Port (If Allowed)
Some shared hosts allow direct port access:
- Access via `https://crossword.network:3000`
- May need firewall configuration
- Less ideal for production

## Recommendation

**For shared hosting:**
1. Try the PHP proxy workaround first
2. Contact Hostinger support about mod_proxy
3. If neither works, consider upgrading to VPS/Cloud

**For full control:**
- Upgrade to VPS/Cloud plan
- Install and configure nginx yourself
- Set up proper reverse proxy

## nginx Configuration (If You Get Access)

If you ever get nginx access, here's the config you'd use:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name crossword.network www.crossword.network;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

But this requires:
- Root access
- Ability to modify nginx config
- Ability to restart nginx service

## Next Steps

1. **Run the diagnostic script** when SSH is available:
   ```bash
   bash check_web_server.sh
   ```

2. **Try PHP proxy** as a workaround

3. **Contact Hostinger** about web server options

4. **Consider upgrading** if you need full control


