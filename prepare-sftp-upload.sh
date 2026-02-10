#!/bin/bash

# Script to prepare files for SFTP upload to Hostinger
# This creates a clean deployment package excluding unnecessary files

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"
DEPLOY_DIR="$PROJECT_ROOT/deploy-package"

echo "🚀 Preparing files for SFTP deployment..."

# Clean previous deployment package
if [ -d "$DEPLOY_DIR" ]; then
  echo "Cleaning previous deployment package..."
  rm -rf "$DEPLOY_DIR"
fi

# Create deployment directory
mkdir -p "$DEPLOY_DIR"

# Build the application first
echo "📦 Building Next.js application..."
cd "$PROJECT_ROOT"
npm run build

# Copy required files and directories
echo "📋 Copying files..."

# Core configuration files
cp package.json "$DEPLOY_DIR/"
cp package-lock.json "$DEPLOY_DIR/"
cp server.js "$DEPLOY_DIR/"
cp next.config.ts "$DEPLOY_DIR/"
cp tsconfig.json "$DEPLOY_DIR/"
cp tailwind.config.ts "$DEPLOY_DIR/"
cp postcss.config.mjs "$DEPLOY_DIR/"
cp eslint.config.mjs "$DEPLOY_DIR/" 2>/dev/null || true
cp components.json "$DEPLOY_DIR/" 2>/dev/null || true

# Source code
echo "  → Copying src/..."
cp -r src "$DEPLOY_DIR/"

# Public assets
echo "  → Copying public/..."
cp -r public "$DEPLOY_DIR/"

# Prisma schema and migrations
echo "  → Copying prisma/..."
cp -r prisma "$DEPLOY_DIR/"

# Build output
echo "  → Copying .next/..."
cp -r .next "$DEPLOY_DIR/"

# Node modules (optional - can install on server instead)
echo "  → Copying node_modules/ (this may take a while)..."
if [ -d "node_modules" ]; then
  # Exclude unnecessary files from node_modules
  rsync -av --exclude='.cache' --exclude='*.log' node_modules "$DEPLOY_DIR/" || cp -r node_modules "$DEPLOY_DIR/"
fi

# Create .env.local template (user must fill in production values)
echo "  → Creating .env.local template..."
cat > "$DEPLOY_DIR/.env.local.template" << 'EOF'
# Database
DATABASE_URL="mysql://USER:PASSWORD@HOST:PORT/DATABASE"

# NextAuth
NEXTAUTH_URL="https://crossword.network"
NEXTAUTH_SECRET="[generate-with-openssl-rand-base64-32]"

# Email (Resend)
RESEND_API_KEY="[your-resend-api-key]"
EMAIL_FROM="Crossword Network <noreply@crossword.network>"
ADMIN_EMAIL="[your-admin-email]"

# Server
NODE_ENV="production"
PORT="3000"
EOF

# Create PM2 ecosystem config
echo "  → Creating PM2 config..."
cat > "$DEPLOY_DIR/ecosystem.config.js" << 'EOF'
module.exports = {
  apps: [{
    name: 'crossword-network',
    script: 'server.js',
    cwd: '/home/u247536265/domains/crossword.network/public_html',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M'
  }]
};
EOF

# Create .htaccess for Apache
echo "  → Creating .htaccess..."
cat > "$DEPLOY_DIR/.htaccess" << 'EOF'
RewriteEngine On

# Proxy to Node.js server (requires mod_proxy)
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ http://localhost:3000/$1 [P,L]

# Fallback: If mod_proxy is disabled, try PHP proxy
# RewriteCond %{REQUEST_FILENAME} !-f
# RewriteCond %{REQUEST_FILENAME} !-d
# RewriteRule ^(.*)$ proxy.php [L,QSA]
EOF

# Copy proxy.php if it exists
if [ -f "proxy.php" ]; then
  cp proxy.php "$DEPLOY_DIR/"
fi

# Create deployment instructions
echo "  → Creating deployment instructions..."
cat > "$DEPLOY_DIR/DEPLOY_INSTRUCTIONS.txt" << 'EOF'
SFTP DEPLOYMENT INSTRUCTIONS
============================

1. CONNECT VIA SFTP:
   sftp -i ~/.ssh/hostinger -P 65002 u247536265@92.112.189.216
   
   Or use FileZilla/WinSCP with:
   - Host: 92.112.189.216
   - Port: 65002
   - Username: u247536265
   - Key file: ~/.ssh/hostinger

2. NAVIGATE TO DEPLOYMENT DIRECTORY:
   cd domains/crossword.network/public_html

3. UPLOAD ALL FILES:
   Upload everything from this deploy-package/ directory to the server.

4. CREATE .env.local:
   - Copy .env.local.template to .env.local
   - Fill in production values (database, API keys, etc.)
   - DO NOT commit .env.local to Git

5. INSTALL DEPENDENCIES (if node_modules not uploaded):
   Use Hostinger control panel terminal or file manager to run:
   npm install --production

6. GENERATE PRISMA CLIENT:
   npx prisma generate

7. RUN MIGRATIONS:
   npx prisma migrate deploy

8. START APPLICATION:
   - Option A: Use Hostinger Node.js manager
   - Option B: Use PM2: pm2 start ecosystem.config.js
   - Option C: node server.js (for testing)

9. VERIFY:
   - Visit https://crossword.network/waitlist
   - Test email submission
   - Check logs for errors

For detailed instructions, see SFTP_DEPLOYMENT_GUIDE.md
EOF

# Calculate package size
PACKAGE_SIZE=$(du -sh "$DEPLOY_DIR" | cut -f1)
echo ""
echo "✅ Deployment package prepared!"
echo "📁 Location: $DEPLOY_DIR"
echo "📊 Size: $PACKAGE_SIZE"
echo ""
echo "📝 Next steps:"
echo "   1. Review .env.local.template and prepare production values"
echo "   2. Upload all files from deploy-package/ via SFTP"
echo "   3. Follow instructions in DEPLOY_INSTRUCTIONS.txt"
echo ""
echo "💡 Tip: You can create a tarball for easier upload:"
echo "   cd $DEPLOY_DIR && tar -czf ../deploy-package.tar.gz ."
echo ""

