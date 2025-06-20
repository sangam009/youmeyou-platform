# Codaloo Design Microservice

Revolutionary AI-powered system architecture design platform with real-time collaboration and intelligent multi-agent assistance.

## 🏗️ Architecture

### Hybrid Data Architecture
- **MySQL**: Stores project and design metadata, user analytics, collaboration sessions
- **MongoDB**: Stores canvas content (nodes, edges, viewport), version history, large JSON documents
- **Redis**: Caching layer for real-time collaboration and performance optimization

### Technology Stack
- **Backend**: Node.js with Express
- **AI Integration**: Google Gemini with A2A multi-agent orchestration
- **Databases**: MySQL 8.0 + MongoDB 7.0 + Redis Alpine
- **Deployment**: Docker Swarm for production, Docker Compose for local development
- **Real-time**: Socket.io for collaboration features

## 🚀 Quick Start

### Local Development
```bash
# Start local development stack
./start-local.sh
```

### Production Deployment (Docker Swarm)
```bash
# Initialize Docker Swarm (if not already done)
docker swarm init

# Deploy to production
./start-production.sh

# Stop production stack
./stop-production.sh
```

## 📦 Environment Setup

### Development Environment
Create `env.development.txt`:
```env
NODE_ENV=development
PORT=4000
MYSQL_HOST=design-mysql-local
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=password
MYSQL_DATABASE=designmicroservice
MONGODB_URI=mongodb://design-mongodb-local:27017
MONGODB_DB=designmicroservice
REDIS_HOST=design-redis-local
REDIS_PORT=6379
REDIS_PASSWORD=localpassword
GEMINI_API_KEY=your_dev_gemini_api_key
A2A_API_KEY=your_dev_a2a_api_key
AUTH_SERVICE_URL=http://localhost:3000
```

### Production Environment
Create `env.production.txt`:
```env
NODE_ENV=production
PORT=4000
MYSQL_HOST=design-mysql-ms
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_secure_mysql_password
MYSQL_DATABASE=designmicroservice
MYSQL_ROOT_PASSWORD=your_secure_mysql_password
MONGODB_URI=mongodb://design-mongodb-ms:27017
MONGODB_DB=designmicroservice
MONGODB_USERNAME=designuser
MONGODB_PASSWORD=your_secure_mongodb_password
REDIS_HOST=design-redis-ms
REDIS_PORT=6379
REDIS_PASSWORD=your_secure_redis_password
GEMINI_API_KEY=your_production_gemini_api_key
A2A_API_KEY=your_production_a2a_api_key
AUTH_SERVICE_URL=http://auth-service:3000
```

## 🔧 API Endpoints

### Canvas Management
- `POST /canvas` - Create new canvas
- `GET /canvas/:canvasId` - Get canvas by ID
- `PUT /canvas/:canvasId` - Update canvas
- `DELETE /canvas/:canvasId` - Delete canvas
- `GET /projects/:projectId/canvases` - Get project canvases
- `POST /canvas/:canvasId/duplicate` - Duplicate canvas

### Version Control
- `GET /canvas/:canvasId/versions` - Get canvas versions
- `POST /canvas/:canvasId/restore/:version` - Restore version

### Export & Generation
- `GET /canvas/:canvasId/export/:format` - Export canvas (json, docker-compose)
- `GET /canvas/:canvasId/analytics` - Get canvas analytics

### AI Agents
- `POST /agents/analyze` - Analyze architecture with AI
- `POST /agents/suggest` - Get AI suggestions
- `POST /agents/validate` - Validate design patterns
- `POST /agents/generate-docs` - Generate documentation

### Search & Analytics
- `GET /search?q=query` - Search canvases
- `GET /analytics/:canvasId` - Get detailed analytics

## 🤖 AI Agent Capabilities

### Architecture Designer
- System design patterns and best practices
- Scalability recommendations
- Performance optimization suggestions

### Database Designer
- Schema design and relationships
- Database optimization
- Data modeling recommendations

### API Designer
- REST, GraphQL, gRPC endpoint design
- API documentation generation
- Integration patterns

### Security Architect
- Authentication and authorization patterns
- Security compliance checks
- Encryption recommendations

## 🐳 Docker Swarm Deployment

### Service Configuration
- **design-service**: Main application (2 replicas)
- **design-mysql-ms**: MySQL database (manager node)
- **design-mongodb-ms**: MongoDB database (manager node)
- **design-redis-ms**: Redis cache (manager node)

### Networking
- Overlay network: `design-network`
- Attachable for cross-service communication
- Internal service discovery

### Storage
- Persistent volumes for database data
- Log volumes for debugging
- Configuration volumes for initialization

### Health Checks
- Application: HTTP health endpoint
- MySQL: `mysqladmin ping`
- MongoDB: `mongosh ping`
- Redis: `redis-cli ping`

## 📊 Data Models

### MySQL Tables
- `design_metadata`: Project and design metadata
- `project_stats`: Analytics and usage statistics
- `collaboration_sessions`: Real-time collaboration data

### MongoDB Collections
- `canvas_content`: Canvas nodes, edges, viewport data
- `canvas_versions`: Version history and snapshots

## 🔄 Real-time Collaboration

- WebSocket connections for live updates
- User presence and cursor tracking
- Conflict resolution for simultaneous edits
- Live commenting and annotation system

## 🚦 Monitoring & Logging

### Production Monitoring
```bash
# Check service status
docker service ls --filter label=com.docker.stack.namespace=design-stack

# View logs
docker service logs design-stack_design-service

# Monitor resources
docker stack ps design-stack
```

### Health Checks
- Application: `GET /health`
- Database connections: Automatic validation
- AI service connectivity: Periodic checks

## 🧪 Testing

### Local Testing
```bash
# Start test environment
docker-compose -f docker-compose.local.yml up -d

# Run tests (when available)
npm test
```

### Load Testing
- Canvas creation/update performance
- Concurrent user collaboration
- AI agent response times

## 🔐 Security

### Authentication
- Integration with auth microservice
- Session-based authentication
- User authorization checks

### Data Security
- Encrypted database connections
- Secure environment variable handling
- Network isolation in Docker Swarm

## 📈 Performance Optimization

### Database Performance
- MySQL indexes for metadata queries
- MongoDB indexes for content searches
- Redis caching for frequently accessed data

### Application Performance
- Connection pooling for databases
- Lazy loading for large canvas data
- Optimized AI agent context management

## 🔧 Development

### Adding New Features
1. Update models for data structure changes
2. Implement service layer logic
3. Add controller endpoints
4. Update API documentation
5. Add tests and validation

### Database Migrations
- MySQL schema changes via init scripts
- MongoDB collection updates via migration scripts
- Version compatibility checks

## 📋 Deployment Checklist

### Pre-deployment
- [ ] Environment variables configured
- [ ] Docker Swarm initialized
- [ ] Network connectivity verified
- [ ] AI API keys validated

### Post-deployment
- [ ] Service health checks passing
- [ ] Database connections established
- [ ] AI agents responding
- [ ] Real-time features working

## 🤝 Integration

### Auth Microservice
- Session validation
- User authentication
- Permission checking

### Frontend Integration
- Canvas API endpoints
- Real-time WebSocket connection
- AI agent communication

### Other Services
- Export to deployment services
- Integration with CI/CD pipelines
- Monitoring and alerting systems

## 📚 Additional Resources

- [API Documentation](./api-spec.md)
- [Docker Swarm Guide](https://docs.docker.com/engine/swarm/)
- [MongoDB Best Practices](#)
- [AI Agent Configuration](#)

---

**Codaloo Design Microservice** - Revolutionizing system architecture design with AI-powered collaboration. 