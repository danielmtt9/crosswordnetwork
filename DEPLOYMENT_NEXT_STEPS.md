# Deployment Next Steps - Complete the Setup (Hostinger)

## ✅ What's Done

1. ✅ Application built locally
2. ✅ Files uploaded via SFTP to `~/domains/crossword.network/public_html`
3. ✅ Setup script uploaded to server

## 🔧 What You Need to Do Now

## Recommended Approach (GitHub -> Hostinger Node.js App)

The preferred production deployment is **GitHub deploy via Hostinger Node.js App**, using a dedicated app root folder:

- Node app root: `~/domains/crossword.network/nodeapp`
- Web root: `~/domains/crossword.network/public_html`

See: `DEPLOYMENT_HOSTINGER.md` and `deploy/hostinger/nodeapp/README.md`.

---

Since SSH command execution is blocked, use **Hostinger's control panel** to complete the setup:

### Step 1: Create `.env.local` File

1. Log into Hostinger control panel
2. Navigate to **File Manager**
3. Go to `domains/crossword.network/public_html`
4. Create a new file called `.env.local`
5. Copy the content from `.env.local.template` and fill in your production values:

```env
# Database (use your production database credentials)
DATABASE_URL="mysql://u247536265_omusi:Omusi211093@82.197.82.72:3306/u247536265_crossword"

# NextAuth
NEXTAUTH_URL="https://crossword.network"
NEXTAUTH_SECRET="[generate-a-random-secret-here]"

# Email (Resend)
RESEND_API_KEY="[your-resend-api-key]"
EMAIL_FROM="Crossword Network <noreply@crossword.network>"
ADMIN_EMAIL="[your-admin-email]"

# Server
NODE_ENV="production"
PORT="3000"
```

**Important**: 
- Replace `[your-resend-api-key]` with your actual Resend API key
- Replace `[your-admin-email]` with your email address
- Generate `NEXTAUTH_SECRET` using: `openssl rand -base64 32` (or use Hostinger's terminal)

### Step 2: Run Setup Script

**Option A: Via Hostinger Control Panel Terminal**

1. In Hostinger control panel, look for **Terminal** or **SSH Terminal**
2. Navigate to the directory:
   ```bash
   cd ~/domains/crossword.network/public_html
   ```
3. Run the setup script:
   ```bash
   bash setup-server.sh
   ```

**Option B: Manual Steps**

If you can't run the script, do these steps manually:

1. **Install dependencies**:
   ```bash
   cd ~/domains/crossword.network/public_html
   npm install --production
   ```

2. **Generate Prisma client**:
   ```bash
   npx prisma generate
   ```

3. **Run migrations**:
   ```bash
   npx prisma migrate deploy
   ```

### Step 3: Start the Server

**Option A: Using PM2 (Recommended)**

1. If PM2 is installed, start the app:
   ```bash
   cd ~/domains/crossword.network/public_html
   pm2 start ecosystem.config.js
   pm2 save
   ```

2. Check status:
   ```bash
   pm2 list
   pm2 logs crossword-network
   ```

**Option B: Using Hostinger Node.js Manager**

1. In Hostinger control panel, look for **Node.js** or **Applications**
2. Create a new Node.js application:
   - **Name**: `crossword-network`
   - **Start Command**: `npm start` or `node server.js`
   - **Working Directory**: `domains/crossword.network/public_html`
   - **Port**: `3000` (or whatever Hostinger assigns)
   - **Environment Variables**: Add all variables from `.env.local`

**Option C: Direct Node (Testing Only)**

```bash
cd ~/domains/crossword.network/public_html
node server.js
```

### Step 4: Configure Web Server

Since Apache is likely running, you may need to configure it:

1. **Check if `.htaccess` is working**:
   - The `.htaccess` file should proxy requests to Node.js
   - If you get 403 errors, Apache `mod_proxy` might be disabled

2. **Alternative: Use PHP Proxy**:
   - The `proxy.php` file is already uploaded
   - Configure Apache to use it as a fallback

3. **Contact Hostinger Support** if:
   - You get 403 Forbidden errors
   - Apache proxy doesn't work
   - You need help configuring the web server

### Step 5: Verify Deployment

1. **Visit the waitlist page**:
   - Go to `https://crossword.network/waitlist`
   - You should see the waitlist form

2. **Test email submission**:
   - Submit a test email
   - Check that:
     - ✅ Email is stored in database
     - ✅ User receives confirmation email
     - ✅ Admin receives notification email

3. **Check logs**:
   - PM2 logs: `pm2 logs crossword-network`
   - Hostinger logs: Check in control panel → Logs
   - Application logs: `~/domains/crossword.network/public_html/logs/`

## 🔍 Troubleshooting

### Issue: "Cannot find module" errors

**Solution**: Dependencies not installed
```bash
cd ~/domains/crossword.network/public_html
npm install --production
```

### Issue: Prisma client errors

**Solution**: Generate Prisma client
```bash
npx prisma generate
```

### Issue: Database connection errors

**Solution**: 
- Verify `DATABASE_URL` in `.env.local` is correct
- Check database firewall/whitelist settings
- Test connection from Hostinger's database panel

### Issue: 403 Forbidden

**Solution**: 
- Apache `mod_proxy` may be disabled on shared hosting
- Try using `proxy.php` as fallback
- Contact Hostinger support to enable `mod_proxy`

### Issue: Port already in use

**Solution**:
- Check what's using the port: `lsof -i :3000` (if terminal access)
- Use a different port in `.env.local`
- Update `.htaccess` or proxy to match new port

### Issue: Emails not sending

**Solution**:
- Verify `RESEND_API_KEY` is correct
- Check Resend domain verification status
- Check Resend dashboard for rate limits or errors

## 📞 Need Help?

1. **Check Hostinger logs** in the control panel
2. **Check application logs**: `pm2 logs` or `logs/` directory
3. **Verify environment variables** are set correctly
4. **Contact Hostinger support** for server configuration issues
5. **Check Resend dashboard** for email delivery issues

## ✅ Success Checklist

- [ ] `.env.local` created with production values
- [ ] Dependencies installed (`npm install`)
- [ ] Prisma client generated (`npx prisma generate`)
- [ ] Database migrations run (`npx prisma migrate deploy`)
- [ ] Server started (PM2 or Node.js manager)
- [ ] Waitlist page accessible at `https://crossword.network/waitlist`
- [ ] Email submission works
- [ ] Confirmation emails sent
- [ ] Admin notifications received

---

**Once all checkboxes are complete, your waitlist page is live! 🎉**
