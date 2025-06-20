# Authentication Microservice

A reusable authentication microservice that provides centralized login and user role management across platforms.

## Tech Stack

- **Backend**: Node.js (Express)
- **Authentication**: Firebase Authentication
- **Database**: MySQL
- **Session Management**: Express sessions with Redis
- **Deployment**: Docker, Docker Swarm

## Features

- Built as a reusable authentication microservice
- Uses Express sessions and Firebase tokens with Redis for centralized caching
- Cookie-based session validation on every request
- Session validation endpoint for other microservices
- Google Login (MVP) with phone authentication support planned for future
- User management and role-based access control

## API Endpoints

### User Management

#### POST /user/create
Creates a new user after Firebase authentication or logs in an existing user.

**Request:**
```json
{
  "provider": "google",
  "payload": {
    "token": "firebase_id_token",
    "refresh_token": "firebase_refresh_token",
    "user": {} // Firebase user data
  }
}
```

**Response:**
```json
{
  "status": "success",
  "message": "User created successfully"
}
```

#### PATCH /user/update
Updates user profile information.

**Request:**
```json
{
  "uuid": "user_uuid",
  "payload": {
    "displayName": "New Name",
    "photoUrl": "https://example.com/photo.jpg"
  }
}
```

**Response:**
```json
{
  "status": "success",
  "message": "User updated successfully"
}
```

#### GET /user/:uuid
Returns user details for profile screen.

**Response:**
```json
{
  "status": "success",
  "user": {
    "uuid": "user_uuid",
    "email": "user@example.com",
    "display_name": "User Name",
    "photo_url": "https://example.com/photo.jpg",
    "provider": "google",
    "roles": [
      {
        "name": "user",
        "permissions": {
          "dashboard": { "read": true, "write": false },
          "profile": { "read": true, "write": true }
        }
      }
    ]
  }
}
```

### Session Management

#### POST /session/validate
Validates a session token. This endpoint is meant to be called by other microservices.

**Request:**
```json
{
  "sessionId": "session_id"
}
```
or
```json
{
  "token": "session_token"
}
```

**Response:**
```json
{
  "status": "success",
  "session": {
    "uuid": "user_uuid",
    "user_profile": {
      "uuid": "user_uuid",
      "displayName": "User Name",
      "email": "user@example.com",
      "photoUrl": "https://example.com/photo.jpg",
      "provider": "google"
    },
    "role": {
      "name": "user",
      "permissions": {
        "dashboard": { "read": true, "write": false },
        "profile": { "read": true, "write": true }
      }
    }
  }
}
```

#### GET /session/check
Simple session check for the current user. Requires a valid session cookie.

**Response:**
```json
{
  "status": "success",
  "message": "Session is valid",
  "user": {
    "uuid": "user_uuid",
    "role": "user"
  }
}
```

## Setup and Installation

### Local Development

1. Install dependencies:
   ```
   npm install
   ```

2. Create a `.env.development` file based on `.env.example` and fill in your configuration values.

3. Start the development server:
   ```
   npm run dev
   ```

### Docker Deployment

1. Build the Docker image:
   ```
   docker build -t auth-service .
   ```

2. Run the container:
   ```
   docker run -p 3000:3000 --env-file .env auth-service
   ```

### Docker Swarm Deployment

1. Initialize Docker Swarm (if not already done):
   ```
   docker swarm init
   ```

2. Deploy the stack:
   ```
   docker stack deploy -c ../docker-compose.yml auth-stack
   ```

3. Check the services:
   ```
   docker service ls
   ```

4. Scale the auth service:
   ```
   docker service scale auth-stack_auth-service=3
   ```

5. Remove the stack:
   ```
   docker stack rm auth-stack
   ```

## Session Cookie Structure

The session cookie contains the following information:

```json
{
  "uuid": "user_uuid",
  "user_profile": {
    "uuid": "user_uuid",
    "displayName": "User Name",
    "email": "user@example.com",
    "photoUrl": "https://example.com/photo.jpg",
    "provider": "google"
  },
  "role": {
    "name": "user",
    "permissions": {
      "dashboard": { "read": true, "write": false },
      "profile": { "read": true, "write": true }
    }
  },
  "ttl": 1626854400000
}
```

## Integration with Other Services

This microservice is designed to be integrated with other applications as a centralized authentication system. Other services can validate the session cookie by calling the `/session/validate` endpoint.

### Example Integration:

1. User logs in through the auth service
2. Auth service sets a session cookie
3. Other services can verify the session by making a request to `/session/validate`
4. If valid, the services can proceed with their operations
5. If invalid, they should redirect the user to the login page

## Directory Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── database.js      # MySQL connection configuration
│   │   └── firebase.js      # Firebase admin configuration
│   ├── controllers/
│   │   └── userController.js # User-related request handlers
│   ├── middleware/
│   │   └── authMiddleware.js # Authentication middleware
│   ├── models/
│   │   └── userModel.js     # User database operations
│   ├── routes/
│   │   ├── userRoutes.js    # User-related API routes
│   │   └── sessionRoutes.js # Session validation routes
│   └── index.js             # Main application entry point
├── .env.development         # Development environment variables
├── .env.example             # Example environment variables
├── Dockerfile               # Docker configuration
└── package.json             # Project dependencies
``` 