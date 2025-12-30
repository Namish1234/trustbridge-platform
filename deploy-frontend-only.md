# 🚀 Deploy TrustBridge Frontend Only

Since the full deployment might be complex, let's deploy just the frontend in demo mode first.

## Method 1: Deploy to Netlify (Easiest)

### Step 1: Build the Frontend
```bash
cd frontend
npm install
npm run build
```

### Step 2: Deploy to Netlify
1. Go to [netlify.com](https://netlify.com)
2. Sign up/Login
3. Drag and drop the `frontend/dist` folder to Netlify
4. Your site will be live instantly!

## Method 2: Deploy to Vercel

### Step 1: Create a New Repository (Frontend Only)
1. Create a new GitHub repository called `trustbridge-demo`
2. Copy only the frontend folder contents to the root
3. Add these files to the root:

**package.json**:
```json
{
  "name": "trustbridge-demo",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "preview": "vite preview"
  },
  "dependencies": {
    "@tanstack/react-query": "^5.90.15",
    "@types/react-router-dom": "^5.3.3",
    "axios": "^1.13.2",
    "lucide-react": "^0.562.0",
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "react-router-dom": "^7.11.0",
    "recharts": "^3.6.0"
  },
  "devDependencies": {
    "@eslint/js": "^9.39.1",
    "@tailwindcss/forms": "^0.5.11",
    "@tailwindcss/typography": "^0.5.19",
    "@types/node": "^24.10.1",
    "@types/react": "^19.2.5",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^5.1.1",
    "autoprefixer": "^10.4.23",
    "eslint": "^9.39.1",
    "eslint-plugin-react-hooks": "^7.0.1",
    "eslint-plugin-react-refresh": "^0.4.24",
    "globals": "^16.5.0",
    "postcss": "^8.5.6",
    "tailwindcss": "^3.4.19",
    "typescript": "~5.9.3",
    "typescript-eslint": "^8.46.4",
    "vite": "^7.2.4"
  }
}
```

**.env**:
```
VITE_DEMO_MODE=true
VITE_APP_ENV=production
```

**vercel.json**:
```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### Step 2: Deploy to Vercel
1. Push to GitHub
2. Connect to Vercel
3. Deploy automatically

## Method 3: Quick Manual Deploy

I can help you create a simplified version right now:

1. **Copy frontend files to a new folder**
2. **Set up environment for demo mode**
3. **Build and deploy**

Would you like me to create a simplified deployment package for you?