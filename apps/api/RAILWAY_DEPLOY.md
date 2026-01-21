# Deploy Mekanos API to Railway

## Prerequisites
- Railway account connected to GitHub (lorddeep3@gmail.com)
- Repository: `LordDeep69/mekanos-app-produccion`

## Steps to Deploy

### 1. Create New Project in Railway
1. Go to [railway.app](https://railway.app)
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose `LordDeep69/mekanos-app-produccion`

### 2. Configure Root Directory
In Railway settings, set:
- **Root Directory**: `apps/api`

### 3. Configure Environment Variables
Add these variables in Railway dashboard:

```env
# Required
NODE_ENV=production
PORT=3000

# Database (Supabase PostgreSQL)
DATABASE_URL=postgresql://...

# JWT
JWT_SECRET=your-production-secret
JWT_EXPIRATION=15m
JWT_REFRESH_SECRET=your-refresh-secret
JWT_REFRESH_EXPIRATION=7d

# CORS (add your frontend URLs)
CORS_ORIGIN=https://your-admin-portal.vercel.app

# Cloudinary (for images)
CLOUDINARY_CLOUD_NAME_PLANTAS=...
CLOUDINARY_API_KEY_PLANTAS=...
CLOUDINARY_API_SECRET_PLANTAS=...
CLOUDINARY_CLOUD_NAME_BOMBAS=...
CLOUDINARY_API_KEY_BOMBAS=...
CLOUDINARY_API_SECRET_BOMBAS=...

# R2 (for PDFs)
R2_PLANTAS_ACCOUNT_ID=...
R2_PLANTAS_ACCESS_KEY_ID=...
R2_PLANTAS_SECRET_ACCESS_KEY=...
R2_PLANTAS_BUCKET_NAME=...
R2_PUBLIC_URL=https://pub-xxx.r2.dev

# Email
EMAIL_SMTP_HOST=smtp.gmail.com
EMAIL_SMTP_PORT=587
EMAIL_SMTP_USER=mekanossas4@gmail.com
EMAIL_SMTP_PASS=your-app-password
EMAIL_FROM=mekanossas4@gmail.com
```

### 4. Deploy
Railway will automatically:
1. Detect NestJS project
2. Run `npm run build`
3. Start with `npm run start:prod`

### 5. Verify
- Health check: `https://your-app.railway.app/api/health`
- Swagger docs: `https://your-app.railway.app/api/docs`

## Troubleshooting

### Build fails with workspace dependencies
The monorepo uses pnpm workspaces. Make sure:
- Root directory is set to `apps/api`
- nixpacks.toml is present

### Puppeteer issues
Railway includes Chromium by default with Nixpacks.

## Current Production Values
Copy from your local `.env` file to Railway dashboard.
