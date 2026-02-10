# SFTP Deployment Guide for Hostinger

Since SSH command execution is blocked, use SFTP to upload files and then run commands via Hostinger's control panel or web interface.

## Prerequisites

- SFTP client (FileZilla, WinSCP, VS Code SFTP extension, or command-line `sftp`)
- SSH key: `~/.ssh/hostinger`
- Server details:
  - Host: `92.112.189.216`
  - Port: `65002`
  - Username: `u247536265`
  - Remote path: `~/domains/crossword.network/public_html`

---

## Step 1: Build the Application Locally

Before uploading, build the Next.js application on your local machine:

```bash
cd /home/danielaroko/applications/crosswordnetwork

# Install dependencies (if not already done)
npm install

# Build the application
npm run build
```

This creates:
- `.next/` directory (production build)
- `node_modules/` (dependencies)
- Compiled TypeScript files

---

## Step 2: Prepare Files for Upload

### Files to Upload (Required)

Upload these files and directories:

```
✅ package.json
✅ package-lock.json
✅ server.js
✅ next.config.ts
✅ tsconfig.json
✅ tailwind.config.ts
✅ postcss.config.mjs
✅ prisma/ (entire directory)
✅ src/ (entire directory)
✅ public/ (entire directory)
✅ .next/ (entire directory - the build output)
✅ node_modules/ (entire directory - or install on server)
```

### Files to Create on Server

Create these files directly on the server (via SFTP or Hostinger file manager):

1. **`.env.local`** - Environment variables (see below)
2. **`.htaccess`** - Apache configuration (if needed)
3. **`ecosystem.config.js`** - PM2 configuration (optional)

### Files to Exclude (Don't Upload)

```
❌ .git/
❌ .next/cache/
❌ node_modules/ (if you'll install on server)
❌ .env.local (upload separately with correct values)
❌ *.log
❌ .DS_Store
❌ coverage/
❌ tests/
❌ *.md (documentation files)
```

---

## Step 3: SFTP Upload Process

### Option A: Using Command Line SFTP

```bash
# Connect via SFTP
sftp -i ~/.ssh/hostinger -P 65002 u247536265@92.112.189.216

# Once connected, navigate to the deployment directory
cd domains/crossword.network/public_html

# Upload files (from your local machine)
put -r package.json
put -r package-lock.json
put -r server.js
put -r next.config.ts
put -r tsconfig.json
put -r tailwind.config.ts
put -r postcss.config.mjs
put -r prisma
put -r src
put -r public
put -r .next

# Exit SFTP
exit
```

### Option B: Using FileZilla

1. Open FileZilla
2. File → Site Manager → New Site
3. Configure:
   - **Protocol**: SFTP - SSH File Transfer Protocol
   - **Host**: `92.112.189.216`
   - **Port**: `65002`
   - **Logon Type**: Key file
   - **User**: `u247536265`
   - **Key file**: `~/.ssh/hostinger`
4. Connect
5. Navigate to: `domains/crossword.network/public_html`
6. Drag and drop files from local to remote

### Option C: Using VS Code SFTP Extension

1. Install "SFTP" extension by Natizyskunk
2. Create `.vscode/sftp.json`:
```json
{
  "name": "Hostinger",
  "host": "92.112.189.216",
  "protocol": "sftp",
  "port": 65002,
  "username": "u247536265",
  "privateKeyPath": "~/.ssh/hostinger",
  "remotePath": "/home/u247536265/domains/crossword.network/public_html",
  "uploadOnSave": false,
  "ignore": [
    ".git",
    "node_modules",
    ".next/cache",
    "*.log",
    ".DS_Store"
  ]
}
```
3. Right-click files/folders → "Upload Folder" or "Upload File"

---

## Step 4: Create Environment File on Server

After uploading files, create `.env.local` on the server with production values:

```env
# Database
DATABASE_URL="mysql://u247536265_omusi:Omusi211093@82.197.82.72:3306/u247536265_crossword"

# NextAuth
NEXTAUTH_URL="https://crossword.network"
NEXTAUTH_SECRET="[your-secret-here]"

# Email (Resend)
RESEND_API_KEY="[your-resend-api-key]"
EMAIL_FROM="Crossword Network <noreply@crossword.network>"
ADMIN_EMAIL="[your-admin-email]"

# Server
NODE_ENV="production"
PORT="3000"
```

**Important**: Use Hostinger's file manager or SFTP to create this file. Never commit `.env.local` to Git.

---

## Step 5: Install Dependencies on Server

Since SSH commands are blocked, you have two options:

### Option A: Upload node_modules (Faster, but larger upload)

Upload the entire `node_modules/` directory from your local machine. This is the fastest but requires uploading ~500MB+.

### Option B: Use Hostinger Control Panel

1. Log into Hostinger control panel
2. Navigate to File Manager
3. Look for a "Terminal" or "SSH Terminal" option
4. Run:
```bash
cd ~/domains/crossword.network/public_html
npm install --production
```

### Option C: Generate Prisma Client Locally

Before uploading, generate Prisma client locally:

```bash
npx prisma generate
```

Then upload the `node_modules/.prisma/` directory.

---

## Step 6: Run Database Migrations

If you have access to Hostinger's control panel terminal or can use their database tools:

```bash
cd ~/domains/crossword.network/public_html
npx prisma migrate deploy
```

Or use Hostinger's database management panel to run SQL directly.

---

## Step 7: Start the Application

### Option A: Using Hostinger Control Panel

1. Look for "Node.js" or "Process Manager" in Hostinger dashboard
2. Configure:
   - **Start Command**: `npm start` or `node server.js`
   - **Working Directory**: `domains/crossword.network/public_html`
   - **Port**: `3000` (or whatever Hostinger assigns)

### Option B: Create PM2 Config File

Create `ecosystem.config.js` on the server:

```javascript
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
```

Then use Hostinger's control panel to start PM2, or if you get terminal access:

```bash
pm2 start ecosystem.config.js
pm2 save
```

---

## Step 8: Configure Web Server

Since Apache is likely running, you may need to:

1. **Create `.htaccess`** in `public_html/`:
```apache
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ http://localhost:3000/$1 [P,L]
```

**Note**: This requires `mod_proxy` which may be disabled on shared hosting.

2. **Alternative: Use PHP Proxy**

If Apache proxy doesn't work, use the `proxy.php` file (already created in your project):

- Upload `proxy.php` to `public_html/`
- Point your domain to `proxy.php` or configure Apache to use it

---

## Step 9: Verify Deployment

1. **Check if server is running**:
   - Visit `https://crossword.network`
   - Check Hostinger logs for errors

2. **Test waitlist page**:
   - Visit `https://crossword.network/waitlist`
   - Submit a test email
   - Verify email is received

3. **Check PM2 status** (if using PM2):
   - Via Hostinger control panel
   - Or if terminal access: `pm2 list`

---

## Troubleshooting

### Issue: 403 Forbidden

**Cause**: Apache configuration issue or missing proxy setup.

**Solution**:
- Check `.htaccess` file exists
- Verify `mod_proxy` is enabled (may need Hostinger support)
- Try PHP proxy alternative
- Check file permissions: `chmod 755` for directories, `chmod 644` for files

### Issue: Cannot find module errors

**Cause**: Missing dependencies or Prisma client not generated.

**Solution**:
- Run `npm install` on server
- Run `npx prisma generate` on server
- Verify `node_modules/` is uploaded correctly

### Issue: Database connection errors

**Cause**: Wrong `DATABASE_URL` or firewall blocking connection.

**Solution**:
- Verify `DATABASE_URL` in `.env.local`
- Check Hostinger database whitelist settings
- Test connection from Hostinger's database panel

### Issue: Port already in use

**Cause**: Another process is using port 3000.

**Solution**:
- Check what's running: `lsof -i :3000` (if terminal access)
- Use a different port in `.env.local`
- Update `.htaccess` or proxy to match new port

---

## Quick Reference: SFTP Commands

```bash
# Connect
sftp -i ~/.ssh/hostinger -P 65002 u247536265@92.112.189.216

# Navigate
cd domains/crossword.network/public_html
pwd

# Upload single file
put local-file.txt remote-file.txt

# Upload directory
put -r local-directory remote-directory

# Download file
get remote-file.txt local-file.txt

# List remote files
ls

# Create directory
mkdir new-directory

# Exit
exit
```

---

## Next Steps After Deployment

1. ✅ Set up domain DNS (if not already done)
2. ✅ Configure SSL certificate (Let's Encrypt via Hostinger)
3. ✅ Test waitlist functionality
4. ✅ Monitor logs for errors
5. ✅ Set up automated backups
6. ✅ Configure monitoring/alerting

---

## Support

If you encounter issues:

1. Check Hostinger logs (Dashboard → Logs)
2. Verify all environment variables are set
3. Test database connection separately
4. Contact Hostinger support for SSH/terminal access issues
5. Check Resend domain verification status

