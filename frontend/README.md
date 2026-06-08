# CropWise AI - Smart Farming Assistant

<div align="center">

![CropWise AI](https://img.shields.io/badge/CropWise-AI-green?style=for-the-badge)
![License](https://img.shields.io/badge/license-MIT-blue?style=for-the-badge)
![Node.js](https://img.shields.io/badge/Node.js-v20+-green?style=for-the-badge&logo=node.js)
![React](https://img.shields.io/badge/React-18-blue?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)
![Docker](https://img.shields.io/badge/Docker-Ready-blue?style=for-the-badge&logo=docker)

**AI-powered agricultural advisory system for smart farming decisions**

[Features](#features) • [Quick Start](#quick-start) • [Documentation](#documentation) • [Deployment](#deployment) • [Contributing](#contributing)

</div>

---

## 🌾 Overview

CropWise AI is an intelligent farming assistant that leverages artificial intelligence to help farmers make data-driven decisions. The system provides crop recommendations, disease detection, weather-based insights, and expert agricultural advice.

### Key Features

- 🌱 **Crop Recommendations** - AI-powered suggestions based on soil, climate, and historical data
- 🦠 **Disease Detection** - Image-based crop disease identification and treatment advice
- 🤖 **AI Chat Assistant** - Conversational interface for farming queries powered by Groq & Gemini
- 🌤️ **Weather Integration** - Real-time weather data for informed decision-making
- 📊 **Analytics Dashboard** - Visual insights into farming patterns and predictions
- 📱 **Mobile Responsive** - Works seamlessly on all devices

## 🚀 Quick Start

### Prerequisites

- Node.js v20 or higher
- npm or yarn
- Docker (optional, for containerized deployment)

### Local Development

```bash
# Clone the repository
git clone https://github.com/Alixjhon/cropwise-ai.git
cd cropwise-ai

# Install dependencies
npm install
cd backend && npm install && cd ..

# Set up environment variables
cp .env.example .env
cp backend/.env.example backend/.env
# Edit .env files with your API keys

# Start development servers
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend
npm run dev
```

### Docker Deployment (Recommended)

```bash
# Build and run with Docker Compose
docker-compose up -d --build

# View logs
docker-compose logs -f

# Access the application
# Frontend: http://localhost
# Backend API: http://localhost:5001
```

## 📁 Project Structure

```
cropwise-ai/
├── src/                    # React frontend source
│   ├── components/         # Reusable UI components
│   ├── pages/              # Application pages
│   ├── hooks/              # Custom React hooks
│   └── lib/                # Utilities and helpers
├── backend/                # Node.js backend source
│   ├── src/
│   │   ├── controllers/    # Request handlers
│   │   ├── services/       # Business logic
│   │   ├── models/         # Data models
│   │   ├── routes/         # API routes
│   │   └── middleware/     # Express middleware
│   └── data/               # SQLite database
├── public/                 # Static assets
├── Dockerfile.frontend     # Frontend Docker image
├── Dockerfile.backend      # Backend Docker image
├── docker-compose.yml      # Docker Compose configuration
├── nginx.conf              # Nginx configuration
└── scripts/                # Deployment scripts
```

## 🛠️ Tech Stack

### Frontend
- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **React Router** - Navigation
- **TanStack Query** - Data fetching
- **Recharts** - Data visualization

### Backend
- **Node.js** - Runtime
- **Express** - Web framework
- **TypeScript** - Type safety
- **PostgreSQL** - Primary database
- **SQLite** - Development database
- **JWT** - Authentication

### AI & APIs
- **Groq API** - Fast LLM inference
- **Google Gemini** - Multimodal AI
- **OpenWeather** - Weather data
- **Unsplash** - Agricultural imagery

## 📖 Documentation

- **[Deployment Guide](DEPLOYMENT.md)** - Comprehensive deployment instructions
- **[API Documentation](backend/README.md)** - Backend API reference
- **[Setup Guide](FREE_AI_SETUP_GUIDE.md)** - AI API configuration

## 🔧 Configuration

### Environment Variables

#### Frontend (.env)
| Variable | Description |
|----------|-------------|
| `VITE_API_BASE_URL` | Backend API URL |
| `VITE_OPENWEATHER_API_KEY` | OpenWeather API key |

For Android Appflow builds, set `VITE_API_BASE_URL` to your deployed backend root URL, for example:

```env
VITE_API_BASE_URL=https://cropwise-backend-ihhh.onrender.com
```

Do not include `/api` at the end. The app adds `/api` automatically.

#### Backend (backend/.env)
| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `GROQ_API_KEY` | Groq AI API key |
| `GEMINI_API_KEY` | Google Gemini API key |
| `JWT_SECRET` | JWT signing secret |
| `UNSPLASH_ACCESS_KEY` | Unsplash API key (optional) |

## 🌐 Deployment Options

### 1. Docker (Recommended)
```bash
docker-compose up -d --build
```

### 2. VPS (DigitalOcean, AWS EC2)
Follow the [Deployment Guide](DEPLOYMENT.md) for VPS setup.

### 3. PaaS (Railway, Render, Heroku)
Connect your GitHub repository for automatic deployments.

### Android Appflow Checklist

1. Deploy the backend first so the latest CORS and API changes are live.
2. In Appflow, build from the commit that includes the Android/API fixes.
3. Add this frontend environment variable in the Appflow build:

```env
VITE_API_BASE_URL=https://cropwise-backend-ihhh.onrender.com
```

4. Keep the backend `FRONTEND_URL` environment variable set to your web frontend URL, for example:

```env
FRONTEND_URL=https://cropwise-frontend.onrender.com
```

5. Rebuild the Android app after any backend domain change.

### 4. Kubernetes
Use the provided Docker images with Kubernetes manifests.

## 🧪 Testing

```bash
# Run frontend tests
npm test

# Run backend tests
cd backend && npm test

# Run E2E tests
npm run test:e2e
```

## 📈 Monitoring

The application includes built-in health checks:

- **Frontend Health**: `http://localhost/health`
- **Backend Health**: `http://localhost:5001/health`
- **Database Health**: `http://localhost:5001/health/db`

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [OpenWeather](https://openweathermap.org/) for weather data
- [Groq](https://groq.com/) for fast AI inference
- [Google Gemini](https://ai.google.dev/) for multimodal AI capabilities
- [Unsplash](https://unsplash.com/) for agricultural imagery

## 📞 Support

- **GitHub Issues**: [Report bugs or request features](https://github.com/Alixjhon/cropwise-ai/issues)
- **Discussions**: [Community discussions](https://github.com/Alixjhon/cropwise-ai/discussions)

---

<div align="center">

**Built with ❤️ for sustainable agriculture**

[⭐ Star this repo](https://github.com/Alixjhon/cropwise-ai) • [🍴 Fork](https://github.com/Alixjhon/cropwise-ai/fork) • [📢 Share](https://github.com/Alixjhon/cropwise-ai)

</div>
