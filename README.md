# Enterprise Cloud ERP System

A comprehensive cloud-based enterprise resource planning system with real-time analytics and predictive capabilities.

## Architecture

- **Microservices**: 5 independent services
- **API Gateway**: Centralized routing and authentication
- **Frontend**: React.js with real-time dashboards
- **Databases**: PostgreSQL, MongoDB, Redis
- **Cloud**: AWS deployment with Docker containers

## Services

1. **Auth Service** (Port 3001) - JWT authentication, session management
2. **User Service** (Port 3002) - User management, RBAC
3. **Inventory Service** (Port 3003) - Stock management, warehouse operations
4. **Order Service** (Port 3004) - Order processing, fulfillment
5. **Analytics Service** (Port 3005) - Real-time analytics, reporting

## Quick Start

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

## Documentation

- [API Documentation](./docs/api/)
- [Architecture Guide](./docs/architecture/)
- [Deployment Guide](./docs/deployment/)

## Technologies

- **Backend**: Node.js, Express.js
- **Frontend**: React.js, Chart.js, D3.js
- **Databases**: PostgreSQL, MongoDB, Redis
- **Cloud**: AWS EC2, S3, RDS
- **DevOps**: Docker, Kubernetes, Terraform

## License

MIT
