# Enterprise Cloud ERP System

A comprehensive cloud-based enterprise resource planning system with real-time analytics and predictive capabilities.

## ÌøóÔ∏è Architecture

- **Microservices**: 5 independent services
- **API Gateway**: Centralized routing and authentication
- **Frontend**: React.js with real-time dashboards
- **Databases**: PostgreSQL, MongoDB, Redis
- **Cloud**: AWS deployment with Docker containers

## Ì≥¶ Services

1. **Auth Service** (Port 3001) - JWT authentication, session management
2. **User Service** (Port 3002) - User management, RBAC
3. **Inventory Service** (Port 3003) - Stock management, warehouse operations
4. **Order Service** (Port 3004) - Order processing, fulfillment
5. **Analytics Service** (Port 3005) - Real-time analytics, reporting

## Ì∫Ä Quick Start

### Development with Docker (Recommended)
```bash
# Start all services
docker-compose -f infrastructure/docker/docker-compose.dev.yml up

# Stop all services
docker-compose -f infrastructure/docker/docker-compose.dev.yml down
```

### Development without Docker
```bash
# Install dependencies for all services
npm run install:all

# Start all services
npm run dev:all
```

## Ì≥ö Documentation

- [API Documentation](./docs/api/)
- [Architecture Guide](./docs/architecture/)
- [Deployment Guide](./docs/deployment/)

## Ì¥ß Technologies

- **Backend**: Node.js, Express.js
- **Frontend**: React.js, Chart.js, D3.js
- **Databases**: PostgreSQL, MongoDB, Redis
- **Cloud**: AWS EC2, S3, RDS
- **DevOps**: Docker, Kubernetes, Terraform

## Ì≥Ñ License

MIT
