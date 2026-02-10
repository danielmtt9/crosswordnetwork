# Hostinger .htaccess Configurations for Node.js Proxy

## Issue
The site is returning 403 Forbidden errors. This is because Apache mod_proxy is likely disabled on Hostinger shared hosting.

## Alternative .htaccess Configurations Tried

### Configuration 1: Standard Proxy (Requires mod_proxy)
```apache
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ http://127.0.0.1:3000/$1 [P,L]
ProxyPreserveHost On
ProxyPass / http://127.0.0.1:3000/
ProxyPassReverse / http://127.0.0.1:3000/
```

### Configuration 2: Minimal Proxy
```apache
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . http://127.0.0.1:3000%{REQUEST_URI} [P,L]
```

### Configuration 3: With localhost
```apache
RewriteEngine On
RewriteBase /
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ http://localhost:3000/$1 [P,L]
ProxyPreserveHost On
ProxyPass / http://localhost:3000/
ProxyPassReverse / http://localhost:3000/
```

### Configuration 4: Redirect (Not recommended - breaks API)
```apache
RewriteEngine On
RewriteBase /
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ http://127.0.0.1:3000/$1 [R=302,L]
```

## Root Cause
The 403 error indicates that Apache is blocking the proxy directives. On shared hosting, `mod_proxy` and `mod_proxy_http` are typically disabled for security reasons.

## Solutions

### Option 1: Contact Hostinger Support (Recommended)
Ask Hostinger support to:
1. Enable Apache `mod_proxy` and `mod_proxy_http` modules
2. Allow proxy directives in `.htaccess` for your domain
3. Or configure Node.js application support through their panel

### Option 2: Use a Different Port
Some shared hosts allow Node.js apps on specific ports. Check if Hostinger has a designated Node.js port (often 3000, 3001, or a custom port).

### Option 3: Use a Reverse Proxy Script
Create a PHP proxy script as a workaround:

**proxy.php** (in public_html):
```php
<?php
$url = 'http://127.0.0.1:3000' . $_SERVER['REQUEST_URI'];
$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_HEADER, true);
$response = curl_exec($ch);
curl_close($ch);
list($headers, $body) = explode("\r\n\r\n", $response, 2);
header($headers);
echo $body;
?>
```

Then use `.htaccess`:
```apache
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ proxy.php [L]
```

### Option 4: Check for Node.js Application Manager
Some shared hosts have a Node.js application manager in their control panel. Check if Hostinger provides this feature.

## Current Status
- ✅ PM2 is running
- ✅ Node.js app is built and ready
- ✅ App is listening on port 3000
- ❌ Apache proxy is blocked (403 Forbidden)

## Next Steps
1. Contact Hostinger support to enable mod_proxy
2. Or ask if they have a Node.js application hosting feature
3. Or consider upgrading to a VPS/Cloud plan that allows full Apache configuration

