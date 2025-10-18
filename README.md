# Enterprise Cloud ERP System

A comprehensive cloud-based enterprise resource planning system with real-time analytics and microservices architecture.

## 🏗️ Architecture

**Microservices-based system with:**

- 5 Independent Backend Services
- API Gateway (Port 3000)
- React Frontend with Vite
- PostgreSQL, MongoDB, Redis

## 📦 Services

| Service | Port | Description |
|---------|------|-------------|
| API Gateway | 3000 | Request routing, authentication, rate limiting |
| Auth Service | 3001 | JWT authentication, session management |
| User Service | 3002 | User management, RBAC, permissions |
| Inventory Service | 3003 | Stock management, warehouses |
| Order Service | 3004 | Order processing, fulfillment |
| Analytics Service | 3005 | Real-time analytics, reporting |
| Frontend | 5173 | React dashboard with Vite |

## 🗄️ Databases

| Database | Port | Purpose |
|----------|------|---------|
| PostgreSQL | 5432 | Transactional data (users, orders, inventory) |
| MongoDB | 27017 | Audit logs, unstructured data |
| Redis | 6379 | Caching, sessions, real-time features |

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- Git

### Setup

1. **Clone and navigate**

```bash
cd enterprise-erp-system
```

2.**Start databases**

```bash
docker-compose -f infrastructure/docker/docker-compose.yml up -d
```

3.**Install dependencies**

```bash
npm install
```

4.**Set up environment variables**

```bash
cp .env.example .env
# Edit .env with your configuration
```

5.**Run database migrations**

```bash
npm run db:migrate
```

6.**Start all services**

```bash
npm run dev
```

## 📚 Documentation

- [Architecture Guide](./docs/architecture/)
- [API Documentation](./docs/api/)
- [Deployment Guide](./docs/deployment/)

## 🔧 Development

```bash
# Start all services
npm run dev

# Start specific service
npm run dev:auth
npm run dev:user
npm run dev:inventory

# Run tests
npm run test

# Build for production
npm run build
```

## 🐳 Docker Commands

```bash
# Start all containers
docker-compose -f infrastructure/docker/docker-compose.yml up -d

# Stop all containers
docker-compose -f infrastructure/docker/docker-compose.yml down

# View logs
docker-compose -f infrastructure/docker/docker-compose.yml logs -f

# Restart specific service
docker-compose -f infrastructure/docker/docker-compose.yml restart postgres
```

## 🧪 Testing

```bash
# Run all tests
npm run test:all

# Run tests for specific service
npm run test:auth

# Run integration tests
npm run test:integration

# Run E2E tests
npm run test:e2e
```

## 📊 Current Status

- [x] Phase 1: Foundation & Infrastructure
- [ ] Phase 2: Authentication & Security
- [ ] Phase 3: Core Business Services
- [ ] Phase 4: Analytics & Intelligence
- [ ] Phase 5: Frontend Development
- [ ] Phase 6: DevOps & Deployment

## 📄 License

MIT

---

**Built with:** Node.js • Express • React • PostgreSQL • MongoDB • Redis • Docker • AWS
