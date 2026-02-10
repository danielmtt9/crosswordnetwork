# SFTP Deployment - Ready to Go! ✅

## Status

✅ **SFTP Connection**: Working perfectly!
- Successfully connected to `92.112.189.216:65002`
- Authentication successful
- Can upload/download files

❌ **SSH Command Execution**: Blocked
- Commands fail with "exec request failed on channel 0"
- This is a server-side restriction

## Solution: Use SFTP for File Transfer

Since SSH commands are blocked, use SFTP to upload files, then run commands via:
- Hostinger control panel terminal (if available)
- Hostinger file manager
- Hostinger Node.js process manager

---

## Quick Start

### 1. Prepare Files Locally

Run the preparation script:

```bash
cd /home/danielaroko/applications/crosswordnetwork
./prepare-sftp-upload.sh
```

This will:
- Build your Next.js app
- Create a clean `deploy-package/` directory
- Include all necessary files
- Generate templates for `.env.local`, PM2 config, etc.

### 2. Connect via SFTP

**Option A: Command Line**
```bash
sftp -i ~/.ssh/hostinger -P 65002 u247536265@92.112.189.216
cd domains/crossword.network/public_html
put -r deploy-package/* .
```

**Option B: FileZilla**
- Use the connection details from `SFTP_QUICK_REFERENCE.md`
- Drag and drop files from `deploy-package/` to server

**Option C: VS Code SFTP Extension**
- Install "SFTP" extension
- Use the config from `SFTP_QUICK_REFERENCE.md`

### 3. After Upload

1. **Create `.env.local`** on server with production values
2. **Install dependencies** (via Hostinger control panel):
   ```bash
   npm install --production
   ```
3. **Generate Prisma client**:
   ```bash
   npx prisma generate
   ```
4. **Run migrations**:
   ```bash
   npx prisma migrate deploy
   ```
5. **Start the server** (via Hostinger Node.js manager or PM2)

---

## Files Created

1. **`SFTP_DEPLOYMENT_GUIDE.md`** - Complete step-by-step guide
2. **`SFTP_QUICK_REFERENCE.md`** - Quick command reference
3. **`prepare-sftp-upload.sh`** - Script to prepare deployment package
4. **`SFTP_DEPLOYMENT_SUMMARY.md`** - This file

---

## What You Need to Do

1. ✅ **Run the preparation script**:
   ```bash
   ./prepare-sftp-upload.sh
   ```

2. ✅ **Review and update `.env.local.template`** in `deploy-package/` with your production values

3. ✅ **Upload files via SFTP** to `~/domains/crossword.network/public_html`

4. ✅ **Create `.env.local`** on the server (copy from template, fill in values)

5. ✅ **Use Hostinger control panel** to:
   - Install dependencies (`npm install`)
   - Generate Prisma client (`npx prisma generate`)
   - Run migrations (`npx prisma migrate deploy`)
   - Start the Node.js application

6. ✅ **Test the deployment**:
   - Visit `https://crossword.network/waitlist`
   - Submit a test email
   - Verify emails are sent

---

## Important Notes

- **Don't upload `.env.local`** from your local machine - create it on the server with production values
- **`node_modules/`** can be uploaded OR installed on the server (your choice)
- **`.next/`** directory contains the built app - must be uploaded
- **Prisma client** needs to be generated on the server after upload
- **Apache configuration** may need adjustment (see `.htaccess` in deploy package)

---

## Troubleshooting

If you encounter issues:

1. **Check file permissions** on the server (should be 755 for dirs, 644 for files)
2. **Verify `.env.local`** has correct production values
3. **Check Hostinger logs** for errors
4. **Test database connection** separately
5. **Verify Resend domain** is verified

---

## Next Steps

1. Run `./prepare-sftp-upload.sh` to create the deployment package
2. Upload files via SFTP
3. Configure environment variables on the server
4. Start the application via Hostinger control panel
5. Test and verify everything works

For detailed instructions, see **`SFTP_DEPLOYMENT_GUIDE.md`**.

