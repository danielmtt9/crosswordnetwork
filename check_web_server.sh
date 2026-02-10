#!/bin/bash
# Web Server Diagnostic Script for Hostinger
# Run this when SSH is available: bash check_web_server.sh

echo "=== Web Server Diagnostic ==="
echo ""

echo "1. Checking for Apache..."
which apache2 httpd 2>/dev/null && echo "   ✓ Apache found" || echo "   ✗ Apache not found"
apache2 -v 2>&1 | head -1 || httpd -v 2>&1 | head -1 || echo "   Cannot determine Apache version"

echo ""
echo "2. Checking for nginx..."
which nginx 2>&1 && echo "   ✓ nginx found" || echo "   ✗ nginx not found"
nginx -v 2>&1 || echo "   nginx not installed"

echo ""
echo "3. Checking running web server processes..."
ps aux | grep -E '(apache|httpd|nginx)' | grep -v grep | head -5 || echo "   No web server processes found"

echo ""
echo "4. Checking what's listening on ports 80 and 443..."
netstat -tlnp 2>/dev/null | grep -E ':(80|443)' || \
ss -tlnp 2>/dev/null | grep -E ':(80|443)' || \
echo "   Cannot check ports (netstat/ss not available)"

echo ""
echo "5. Checking web server config directories..."
test -d /etc/nginx && echo "   ✓ /etc/nginx exists" || echo "   ✗ /etc/nginx not found"
test -d /etc/apache2 && echo "   ✓ /etc/apache2 exists" || echo "   ✗ /etc/apache2 not found"
test -d /etc/httpd && echo "   ✓ /etc/httpd exists" || echo "   ✗ /etc/httpd not found"

echo ""
echo "6. Testing localhost response..."
curl -I http://localhost 2>&1 | head -3 || echo "   Cannot connect to localhost"

echo ""
echo "7. Checking domain directory..."
ls -la ~/domains/crossword.network/ 2>&1 | head -5

echo ""
echo "8. Checking .htaccess file..."
test -f ~/domains/crossword.network/public_html/.htaccess && \
  echo "   ✓ .htaccess exists" && \
  cat ~/domains/crossword.network/public_html/.htaccess || \
  echo "   ✗ .htaccess not found"

echo ""
echo "9. Checking if Node.js app is running..."
pm2 list 2>&1 | grep crossword-network || echo "   PM2 or app not running"

echo ""
echo "10. Testing Node.js app directly..."
curl -s http://localhost:3000 2>&1 | head -5 || echo "   Cannot connect to Node.js app on port 3000"

echo ""
echo "=== Diagnostic Complete ==="


