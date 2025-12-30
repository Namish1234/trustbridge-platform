# TrustBridge Deployment Guide

## 🚀 Quick Deploy (Demo Mode)

The easiest way to deploy TrustBridge is in demo mode, which runs the frontend with simulated data.

### Deploy to Vercel (Recommended)

1. **Fork the repository** to your GitHub account
2. **Connect to Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your forked repository
   - Vercel will automatically detect the configuration

3. **Set Environment Variables**:
   ```
   VITE_DEMO_MODE=true
   VITE_APP_ENV=production
   ```

4. **Deploy**: Vercel will automatically build and deploy your app

### Deploy to Netlify

1. **Fork the repository** to your GitHub account
2. **Connect to Netlify**:
   - Go to [netlify.com](https://netlify.com)
   - Click "New site from Git"
   - Choose your forked repository
   - Build settings are automatically detected from `netlify.toml`

3. **Set Environment Variables**:
   ```
   VITE_DEMO_MODE=true
   VITE_APP_ENV=production
   ```

4. **Deploy**: Netlify will build and deploy automatically

## 🏗️ Full Stack Deployment

For a complete deployment with backend and database:

### Backend Deployment (Railway)

1. **Create Railway Account**: Go to [railway.app](https://railway.app)

2. **Deploy Backend**:
   ```bash
   # Install Railway CLI
   npm install -g @railway/cli
   
   # Login to Railway
   railway login
   
   # Deploy from backend directory
   cd backend
   railway deploy
   ```

3. **Add Database**:
   - In Railway dashboard, add PostgreSQL service
   - Add Redis service
   - Connect services to your backend

4. **Set Environment Variables**:
   ```
   NODE_ENV=production
   DATABASE_URL=<railway_postgres_url>
   REDIS_URL=<railway_redis_url>
   JWT_SECRET=<your_jwt_secret>
   FIREBASE_PROJECT_ID=<your_firebase_project>
   ```

### Frontend with Backend

1. **Update Frontend Environment**:
   ```
   VITE_API_URL=<your_railway_backend_url>/api/v1
   VITE_DEMO_MODE=false
   ```

2. **Deploy Frontend** using Vercel/Netlify as above

## 🔧 Environment Variables

### Frontend (.env)
```bash
VITE_API_URL=http://localhost:3001/api/v1  # Backend URL
VITE_DEMO_MODE=true                        # Enable demo mode
VITE_APP_ENV=development                   # Environment
```

### Backend (.env)
```bash
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://user:pass@host:5432/db
REDIS_URL=redis://host:6379
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-refresh-secret
FIREBASE_PROJECT_ID=your-firebase-project
FIREBASE_PRIVATE_KEY=your-firebase-private-key
FIREBASE_CLIENT_EMAIL=your-firebase-client-email
```

## 📱 Demo Features

In demo mode, the application includes:

- ✅ Full UI/UX experience
- ✅ Interactive credit score calculation
- ✅ Dashboard with charts and analytics
- ✅ Loan comparison tools
- ✅ Account connection simulation
- ✅ Responsive design
- ✅ All frontend features

Demo limitations:
- ❌ No real bank account connections
- ❌ No persistent data storage
- ❌ No real credit score calculations

## 🔗 Live Demo

Once deployed, your TrustBridge demo will be available at:
- **Vercel**: `https://your-project.vercel.app`
- **Netlify**: `https://your-project.netlify.app`

## 🛠️ Local Development

```bash
# Clone repository
git clone https://github.com/Namish1234/trustbridge-platform.git
cd trustbridge-platform

# Install dependencies
npm install

# Start development servers
npm run dev
```

## 📞 Support

For deployment issues:
- Check the [GitHub repository](https://github.com/Namish1234/trustbridge-platform)
- Review the technical documentation
- Open an issue for specific problems

---

**TrustBridge** - Bridging the credit gap with alternative scoring 🌉