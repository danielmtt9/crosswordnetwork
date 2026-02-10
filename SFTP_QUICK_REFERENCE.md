# SFTP Quick Reference

## Connection Details

```
Host: 92.112.189.216
Port: 65002
Username: u247536265
Key: ~/.ssh/hostinger
Remote Path: ~/domains/crossword.network/public_html
```

## Quick Commands

### Connect via SFTP
```bash
sftp -i ~/.ssh/hostinger -P 65002 u247536265@92.112.189.216
```

### Upload Single File
```bash
put local-file.txt remote-file.txt
```

### Upload Directory
```bash
put -r local-directory remote-directory
```

### Download File
```bash
get remote-file.txt local-file.txt
```

### Navigate
```bash
cd domains/crossword.network/public_html
pwd
ls
```

### Create Directory
```bash
mkdir new-directory
```

### Exit
```bash
exit
```

## FileZilla Setup

1. **Protocol**: SFTP - SSH File Transfer Protocol
2. **Host**: `92.112.189.216`
3. **Port**: `65002`
4. **Logon Type**: Key file
5. **User**: `u247536265`
6. **Key file**: `~/.ssh/hostinger`

## VS Code SFTP Extension

Create `.vscode/sftp.json`:
```json
{
  "name": "Hostinger",
  "host": "92.112.189.216",
  "protocol": "sftp",
  "port": 65002,
  "username": "u247536265",
  "privateKeyPath": "~/.ssh/hostinger",
  "remotePath": "/home/u247536265/domains/crossword.network/public_html",
  "uploadOnSave": false
}
```

## Essential Files to Upload

- ✅ `package.json` & `package-lock.json`
- ✅ `server.js`
- ✅ `next.config.ts`
- ✅ `tsconfig.json`
- ✅ `src/` (entire directory)
- ✅ `public/` (entire directory)
- ✅ `.next/` (build output)
- ✅ `prisma/` (schema & migrations)
- ✅ `node_modules/` (or install on server)

## Files to Create on Server

- `.env.local` (with production values)
- `.htaccess` (Apache config)
- `ecosystem.config.js` (PM2 config)

## After Upload

1. Create `.env.local` with production values
2. Install dependencies: `npm install --production`
3. Generate Prisma: `npx prisma generate`
4. Run migrations: `npx prisma migrate deploy`
5. Start server: `npm start` or `pm2 start ecosystem.config.js`

