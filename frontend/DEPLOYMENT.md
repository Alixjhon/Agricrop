# CropWise AI Deployment Guide

This guide provides comprehensive instructions for deploying the CropWise AI application.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Local Development](#local-development)
- [Docker Deployment](#docker-deployment)
- [Production Deployment Options](#production-deployment-options)
- [Environment Configuration](#environment-configuration)
- [CI/CD Setup](#cicd-setup)
- [Troubleshooting](#troubleshooting)

## Overview

CropWise AI is a full-stack application consisting of:

- **Frontend**: React + Vite + TypeScript application
- **Backend**: Node.js + Express + TypeScript API server
- **Database**: PostgreSQL (with SQLite fallback for development)

## Prerequisites

### Required Software

- **Node.js** v20 or higher
- **npm** or **yarn** package manager
- **Docker** and **Docker Compose** (for containerized deployment)
- **Git** for version control

### API Keys Required

Before deployment, obtain the following API keys:

1. **OpenWeather API Key** - [Get from OpenWeather](https://openweathermap.org/api)
2. **Groq API Key** - [Get from Groq](https://console.groq.com/keys)
3. **Google Gemini API Key** - [Get from Google AI Studio](https://aistudio.google.com/apikey)
4. **Unsplash API Key** (optional) - [Get from Unsplash](https://unsplash.com/developers)

## Local Development

### 1. Clone the Repository

```bash
git clone https://github.com/Alixjhon/cropwise-ai.git
cd cropwise-ai
```

### 2. Set Up Environment Variables

#### Frontend (.env)

```bash
cp .env.example .env
# Edit .env with your values
```

#### Backend (backend/.env)

```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your values
```

### 3. Install Dependencies

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..
```

### 4. Run Development Servers

```bash
# Terminal 1: Start backend (from project root)
cd backend
npm run dev

# Terminal 2: Start frontend (from project root)
npm run dev
```

- Frontend: http://localhost:8082
- Backend API: http://localhost:5001

## Docker Deployment

### Quick Start with Docker Compose

The easiest way to deploy CropWise AI is using Docker Compose:

```bash
# Build and start all services
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

### Using the Deployment Script

A deployment script is provided for convenience:

```bash
# On Linux/Mac
chmod +x scripts/deploy.sh
./scripts/deploy.sh deploy

# On Windows (PowerShell)
.\scripts\deploy.ps1 deploy
```

### Available Commands

| Command | Description |
|---------|-------------|
| `deploy` | Build and deploy the application |
| `update` | Update and redeploy |
| `stop` | Stop all services |
| `logs` | Show recent logs |
| `clean` | Remove all containers and volumes |

### Accessing the Application

After deployment:

- **Frontend**: http://localhost
- **Backend API**: http://localhost:5001
- **Health Check**: http://localhost/health
- **DB Health Check**: http://localhost:5001/health/db

## Production Deployment Options

### Option 1: VPS with Docker (Recommended)

Deploy to a VPS (DigitalOcean, AWS EC2, Google Cloud Compute):

1. **Install Docker and Docker Compose**

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install docker.io docker-compose

# Start Docker
sudo systemctl start docker
sudo systemctl enable docker
```

2. **Clone Repository**

```bash
git clone https://github.com/Alixjhon/cropwise-ai.git
cd cropwise-ai
```

3. **Configure Environment**

```bash
cp .env.example .env
cp backend/.env.example backend/.env
# Edit environment files with production values
```

4. **Deploy**

```bash
docker-compose up -d --build
```

5. **Set Up Nginx Reverse Proxy (Optional)**

For HTTPS and better performance:

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Option 2: Platform as a Service (PaaS)

#### Deploy to Railway

1. Connect your GitHub repository to Railway
2. Add environment variables in Railway dashboard
3. Railway will automatically detect and deploy

#### Deploy to Render

1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Set build command: `npm run build && cd backend && npm run build`
4. Set start command: Configure for both frontend and backend

#### Deploy to Heroku

Create separate apps for frontend and backend, or use a monorepo buildpack.

### Option 3: Kubernetes

For large-scale deployments, use the provided Docker images with Kubernetes:

```yaml
# Example deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cropwise-frontend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: cropwise-frontend
  template:
    metadata:
      labels:
        app: cropwise-frontend
    spec:
      containers:
      - name: frontend
        image: your-dockerhub/cropwise-frontend:latest
        ports:
        - containerPort: 80
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cropwise-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: cropwise-backend
  template:
    metadata:
      labels:
        app: cropwise-backend
    spec:
      containers:
      - name: backend
        image: your-dockerhub/cropwise-backend:latest
        ports:
        - containerPort: 5001
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: cropwise-secrets
              key: database-url
```

## Environment Configuration

### Frontend Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_API_BASE_URL` | Backend API URL | Yes |
| `VITE_OPENWEATHER_API_KEY` | OpenWeather API key | Yes |

### Backend Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server port (default: 5001) | No |
| `NODE_ENV` | Environment (development/production) | No |
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `GROQ_API_KEY` | Groq AI API key | Yes |
| `GEMINI_API_KEY` | Google Gemini API key | Yes |
| `JWT_SECRET` | JWT signing secret | Yes |
| `UNSPLASH_ACCESS_KEY` | Unsplash API key | No |

### Security Best Practices

1. **Never commit .env files** - They are in .gitignore
2. **Use strong JWT secrets** - Generate with: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
3. **Enable HTTPS** - Use SSL certificates (Let's Encrypt is free)
4. **Set up CORS properly** - Configure allowed origins in backend
5. **Use environment-specific configs** - Different settings for dev/staging/production

## CI/CD Setup

### GitHub Actions

The repository includes a GitHub Actions workflow for CI/CD:

1. **Set Up GitHub Secrets**

Go to your repository settings → Secrets and variables → Actions, and add:

- `DOCKER_USERNAME` - Your Docker Hub username
- `DOCKER_PASSWORD` - Your Docker Hub access token
- `SSH_PRIVATE_KEY` - SSH key for deployment server (optional)
- `SSH_HOST` - Deployment server hostname (optional)
- `SSH_USER` - Deployment server username (optional)

2. **Workflow Triggers**

- **On Pull Request**: Runs linting, type checking, and tests
- **On Push to Main**: Builds and pushes Docker images, optionally deploys

### Updated CI/CD Notes

The current workflow now uses GitHub Container Registry (`ghcr.io`) instead of Docker Hub and deploys only when the production secrets are configured.

Required GitHub Actions secrets:

- `DEPLOY_HOST` - Your production server hostname or IP
- `DEPLOY_USER` - SSH user on the production server
- `DEPLOY_SSH_KEY` - Private key for SSH access from GitHub Actions
- `DEPLOY_PATH` - Absolute path to the app directory on the server
- `DEPLOY_GHCR_USERNAME` - GitHub username that can pull from GHCR
- `DEPLOY_GHCR_TOKEN` - GitHub token or PAT with `read:packages`

Deployment behavior:

- Pull requests run lint, tests, and frontend/backend builds.
- Pushes to `main` or `master` build and publish Docker images.
- If the deploy secrets exist, the workflow syncs the repo files to the server and runs `./scripts/deploy.sh release`.

Server preparation:

```bash
git clone https://github.com/<your-account>/cropwise-ai.git
cd cropwise-ai
cp backend/.env.example backend/.env
# edit backend/.env
```

The production server uses `docker-compose.deploy.yml`, so it only needs Docker, Docker Compose v2, the repository checkout, and a valid `backend/.env`.

### Manual Deployment Checklist

- [ ] Environment variables configured
- [ ] Database connection tested
- [ ] API keys verified
- [ ] Docker images built successfully
- [ ] Health checks passing
- [ ] SSL certificates configured (if using HTTPS)
- [ ] Backup strategy in place
- [ ] Monitoring configured

## Troubleshooting

### Common Issues

#### 1. Database Connection Failed

```
Error: connect ECONNREFUSED
```

**Solution**: Verify DATABASE_URL is correct and database is accessible. Check firewall rules.

#### 2. API Keys Not Working

**Solution**: Verify API keys are correct and have the required permissions. Check API provider dashboards for usage limits.

#### 3. Docker Build Fails

```
ERROR: failed to solve: process didn't complete successfully
```

**Solution**: 
- Ensure all dependencies are listed in package.json
- Check for platform-specific issues
- Try building with `--no-cache`: `docker-compose build --no-cache`

#### 4. Port Already in Use

```
Error: listen EADDRINUSE: address already in use
```

**Solution**: Change the port in environment variables or stop the process using that port.

#### 5. CORS Errors

**Solution**: Ensure backend CORS configuration allows your frontend domain. Check that API_BASE_URL points to the correct backend URL.

### Viewing Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend

# Last 100 lines
docker-compose logs --tail=100 backend
```

### Health Checks

```bash
# Frontend health (via nginx)
curl http://localhost/health

# Backend health
curl http://localhost:5001/health

# Database health
curl http://localhost:5001/health/db
```

### Database Migration

If you need to run database migrations:

```bash
# Inside the backend container
docker-compose exec backend npm run db:migrate
```

## Support

For issues and questions:

- GitHub Issues: https://github.com/Alixjhon/cropwise-ai/issues
- Documentation: Check the wiki for detailed guides

---

**Version**: 1.0.0  
**Last Updated**: 2024
