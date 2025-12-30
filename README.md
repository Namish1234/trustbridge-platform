# TrustBridge - Alternative Credit Scoring Platform

TrustBridge is a fintech platform that leverages the RBI Account Aggregator (AA) framework to generate alternative credit scores for users without traditional credit history. The platform analyzes cash flow patterns, investment behavior, and payment consistency to create comprehensive creditworthiness assessments. Read more details on the medium post- https://medium.com/@namishshukla2/building-trustbridge-a-technical-deep-dive-into-alternative-credit-scoring-5e72d7404f56

## 🚀 Quick Deploy (Demo Mode)

Deploy the demo version instantly:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FNamish1234%2Ftrustbridge-platform&project-name=trustbridge-demo&repository-name=trustbridge-platform&root-directory=frontend&env=VITE_DEMO_MODE,VITE_APP_ENV&envDescription=Environment%20variables%20for%20demo%20mode&envLink=https%3A%2F%2Fgithub.com%2FNamish1234%2Ftrustbridge-platform%23environment-variables)

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/Namish1234/trustbridge-platform&base=frontend)

> **Demo Mode**: Includes full UI/UX with simulated data - no backend required!
> 
> 📖 **[Step-by-step deployment guide](DEPLOY_INSTRUCTIONS.md)**

## 🧠 Built with Kiro

This project was ideated, planned, and architected using **[Kiro IDE](https://kiro.dev)**.

We used Kiro to structure our development process before writing a single line of code.
* **Planning:** The `kiro/` folder contains our initial ideation notes, problem statements, and architectural decisions.
* **Structure:** We used Kiro to map out the frontend/backend data flow (React ↔ Node ↔ PostgreSQL) and the mock data engine.
* **Documentation:** All logic flows for the Credit Scoring Engine and 3D visualizations are documented within the Kiro environment.

👉 **[Check out our Kiro planning folder here](.kiro/specs/trustbridge-platform)**

---

## 🎯 Target Audience

- Gen Z and first-time job seekers
- Freelancers and gig workers
- Small business owners
- Users without traditional credit history

## 🏗️ Architecture

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Vite** for build tooling
- **React Router** for navigation
- **Chart.js/D3.js** for data visualization

### Backend
- **Node.js** with Express.js
- **TypeScript** for type safety
- **PostgreSQL** for data storage
- **Redis** for caching and sessions
- **JWT** for authentication

### Infrastructure
- **Docker** for containerization
- **Firebase Authentication** for user management
- **Account Aggregator APIs** for financial data
- **Helmet.js** for security

## 🚀 Quick Start

### 🌐 Live Demo

**Deploy your own demo instantly:**

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FNamish1234%2Ftrustbridge-platform&env=VITE_DEMO_MODE,VITE_APP_ENV&envDescription=Environment%20variables%20for%20TrustBridge%20demo&project-name=trustbridge-platform)

Or visit the live demo: **[TrustBridge Demo](https://trustbridge-platform.vercel.app)** *(Coming soon)*

### Prerequisites
- Node.js 18+
- Docker and Docker Compose
- PostgreSQL 15+
- Redis 7+

### Development Setup

1. **Clone and setup**
   ```bash
   git clone https://github.com/Namish1234/trustbridge-platform.git
   cd trustbridge-platform
   cp .env.example .env
   ```

2. **Start with Docker**
   ```bash
   docker-compose up -d
   ```

3. **Or run locally**
   ```bash
   # Install dependencies
   npm install
   cd frontend && npm install
   cd ../backend && npm install

   # Start development servers
   npm run dev
   ```

4. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3001
   - Health Check: http://localhost:3001/health

### Environment Configuration

Copy `.env.example` to `.env` and configure:

- **Database**: PostgreSQL connection details
- **Redis**: Cache and session storage
- **Firebase**: Authentication configuration
- **Account Aggregator**: API credentials
- **JWT**: Secret keys for token signing

## 📊 Features

### Core Features
- **Alternative Credit Scoring**: Cash flow and investment analysis
- **Account Aggregator Integration**: Secure financial data access
- **Real-time Score Updates**: Dynamic score recalculation
- **Loan Eligibility Assessment**: Partner bank integration
- **Interactive Visualizations**: Score trends and comparisons

### Security & Compliance
- **RBI AA Framework Compliant**: Registered FIU status
- **Data Encryption**: AES-256 for sensitive data
- **Consent Management**: Granular user permissions
- **Audit Trails**: Comprehensive logging
- **Rate Limiting**: API protection

## 🌐 Deployment

### Quick Deploy (Demo Mode)
- **Vercel**: [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FNamish1234%2Ftrustbridge-platform)
- **Netlify**: Connect your GitHub repo to Netlify for automatic deployment

### Full Stack Deployment
- **Backend**: Railway, Render, or AWS
- **Database**: PostgreSQL on Railway, Supabase, or AWS RDS
- **Cache**: Redis on Railway, Upstash, or AWS ElastiCache

See [Deployment Guide](./DEPLOYMENT_GUIDE.md) for detailed instructions.

## 🛠️ Development

### Project Structure
```
trustbridge-platform/
├── frontend/          # React TypeScript app
├── backend/           # Express.js API server
├── database/          # SQL schemas and migrations
├── docker-compose.yml # Development environment
└── .env.example       # Environment template
```

### Available Scripts

```bash
# Development
npm run dev              # Start both frontend and backend
npm run dev:frontend     # Start only frontend
npm run dev:backend      # Start only backend

# Building
npm run build            # Build both applications
npm run build:frontend   # Build frontend only
npm run build:backend    # Build backend only

# Testing
npm test                 # Run all tests
npm run test:frontend    # Frontend tests
npm run test:backend     # Backend tests
```

### API Endpoints

- `GET /health` - Health check
- `GET /api/v1/status` - API status
- `POST /api/v1/auth/*` - Authentication endpoints
- `GET /api/v1/scores/*` - Credit score endpoints
- `POST /api/v1/accounts/*` - Account connection endpoints

## 🔒 Security

- **Helmet.js**: Security headers
- **Rate Limiting**: Request throttling
- **Input Validation**: Data sanitization
- **HTTPS/TLS**: Encrypted communication
- **JWT Tokens**: Secure authentication
- **Audit Logging**: Activity tracking

## 📈 Monitoring

- Health check endpoints
- Structured logging
- Error tracking
- Performance metrics
- Audit trails

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation

---

**TrustBridge** - Bridging the credit gap with alternative scoring 🌉
