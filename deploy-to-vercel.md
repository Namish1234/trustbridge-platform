# 🚀 Deploy TrustBridge to Vercel - Step by Step

## Option 1: One-Click Deploy (Easiest)

Click this button to deploy directly to Vercel:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FNamish1234%2Ftrustbridge-platform&env=VITE_DEMO_MODE,VITE_APP_ENV&envDescription=Environment%20variables%20for%20TrustBridge%20demo&envLink=https%3A%2F%2Fgithub.com%2FNamish1234%2Ftrustbridge-platform%23environment-variables&project-name=trustbridge-platform&repository-name=trustbridge-platform)

## Option 2: Manual Deployment

### Step 1: Fork the Repository
1. Go to https://github.com/Namish1234/trustbridge-platform
2. Click "Fork" button
3. Fork to your GitHub account

### Step 2: Deploy to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Sign up/Login with GitHub
3. Click "New Project"
4. Import your forked repository
5. Configure project:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

### Step 3: Set Environment Variables
In Vercel dashboard, add these environment variables:
```
VITE_DEMO_MODE=true
VITE_APP_ENV=production
```

### Step 4: Deploy
Click "Deploy" - Vercel will build and deploy your app!

## Expected Result

Your TrustBridge demo will be live at:
`https://your-project-name.vercel.app`

## Features Available in Demo

✅ **Complete UI Experience**
- Homepage with market statistics
- Interactive credit score calculation
- Dashboard with charts and analytics
- Loan comparison tools
- Account connection simulation

✅ **Simulated Data**
- Mock credit scores and history
- Fake bank account connections
- Realistic transaction data
- Interactive visualizations

✅ **Full Functionality**
- Responsive design for all devices
- Professional fintech UI/UX
- Real-time score calculations (simulated)
- Complete user journey flow

## Demo Limitations

❌ No real bank connections
❌ No persistent data storage
❌ No actual credit scoring algorithms
❌ No backend database

## Next Steps

Once deployed, you can:
1. Share the live demo URL
2. Showcase the fintech platform
3. Use it in your portfolio
4. Deploy the full-stack version later

---

**Need help?** Check the [Deployment Guide](./DEPLOYMENT_GUIDE.md) for more options!