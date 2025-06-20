# Authentication Microservice

This directory contains a reusable authentication microservice built with Node.js, Express, Firebase Authentication, MySQL, and Redis, along with a test UI for easy testing.

## Project Structure

```
├── backend/              # Auth microservice backend
│   ├── src/              # Source code
│   ├── .env.development  # Development environment variables
│   ├── Dockerfile        # Docker configuration
│   └── package.json      # Dependencies
├── frontend/             # Test UI
│   ├── public/           # Static files
│   ├── src/              # React components
│   └── package.json      # Dependencies
├── mysql/                # MySQL initialization
│   └── init/             # Schema files
├── nginx/                # Nginx configuration (for production)
├── docker-compose.yml    # Main Docker Compose file
├── docker-compose.local.yml # Local development Docker Compose file
├── mysql.env             # MySQL environment variables
├── api-tests.md          # API test commands
├── api-specification.md  # Detailed API documentation
└── start-dev.sh          # Development startup script
```

## Getting Started

### Prerequisites

- Docker
- Docker Compose
- Node.js (v14+)
- npm (v6+)

### Starting the Auth Service

1. Make the startup script executable:
   ```bash
   chmod +x start-dev.sh
   ```

2. Run the development environment:
   ```bash
   ./start-dev.sh
   ```

   This script will:
   - Create required directories
   - Start MySQL, Redis, and the Auth Service
   - Expose the Auth Service on port 3000

3. Check if the service is running:
   ```bash
   curl http://localhost:3000/health
   ```

### Starting the Test UI

1. Make the frontend startup script executable:
   ```bash
   chmod +x frontend/start-frontend.sh
   ```

2. Run the React application:
   ```bash
   cd frontend
   ./start-frontend.sh
   ```

   This will start the React development server on port 3001 (or another available port).

3. Open your browser and navigate to `http://localhost:3001`

## Testing the APIs

You can test the APIs in several ways:

1. **Using the Test UI**:
   - Open the React app in your browser
   - Use the login functionality
   - Test the profile update and session validation features

2. **Using cURL commands**:
   - See the `api-tests.md` file for a complete list of test commands
   - Run the commands from your terminal

3. **Using Postman**:
   - Import the cURL commands into Postman
   - Create a collection for easier testing
   - Save cookies for authenticated requests

## API Documentation

Detailed API documentation is available in the `api-specification.md` file. The documentation includes:

- All available endpoints
- Request/response formats
- Status codes and error handling
- Integration examples for other microservices
- Authentication flows

This documentation is essential for other services that need to interact with the authentication microservice.

## Stopping the Services

To stop the local development environment:

```bash
docker-compose -f docker-compose.local.yml down
```

## Cleanup

To remove all containers and volumes:

```bash
docker-compose -f docker-compose.local.yml down -v
``` 