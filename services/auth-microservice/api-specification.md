# Authentication Microservice API Specification

This document provides detailed specifications for the Authentication Microservice API endpoints, including request/response formats, status codes, and examples.

## Base URL

For local development: `http://localhost:3000`

## Authentication

Most endpoints require authentication via session cookies. The session cookie (`connect.sid`) is set upon successful login.

## API Endpoints

### Health Check

#### GET /health

Check if the auth service is running.

**Request:**
```
GET /health
```

**Response:**
```json
{
  "status": "success",
  "message": "Auth service is running",
  "timestamp": "2023-05-03T12:00:00.000Z"
}
```

**Status Codes:**
- `200 OK`: Service is running normally

---

### User Management

#### POST /user/create

Create a new user after Firebase authentication.

**Request:**
```
POST /user/create
Content-Type: application/json

{
  "provider": "google",
  "payload": {
    "token": "FIREBASE_ID_TOKEN",
    "refresh_token": "FIREBASE_REFRESH_TOKEN",
    "user": {
      "uid": "FIREBASE_USER_UID",
      "email": "user@example.com",
      "displayName": "Test User",
      "photoURL": "https://example.com/photo.jpg",
      "phoneNumber": null
    }
  }
}
```

**Response (Success):**
```json
{
  "status": "success",
  "message": "User created successfully",
  "user": {
    "uuid": "user-uuid-here",
    "firebase_uid": "firebase-uid-here",
    "email": "user@example.com",
    "display_name": "Test User",
    "photo_url": "https://example.com/photo.jpg",
    "provider": "google",
    "roles": [
      {
        "name": "user",
        "permissions": {
          "dashboard": {
            "read": true,
            "write": false
          },
          "profile": {
            "read": true,
            "write": true
          }
        }
      }
    ]
  }
}
```

**Response (Error):**
```json
{
  "status": "error",
  "message": "Error message here"
}
```

**Status Codes:**
- `201 Created`: User created successfully
- `400 Bad Request`: Invalid request body
- `409 Conflict`: User already exists
- `500 Internal Server Error`: Server error

---

#### GET /user/:uuid

Get a user's profile information.

**Request:**
```
GET /user/user-uuid-here
```

**Response (Success):**
```json
{
  "status": "success",
  "user": {
    "uuid": "user-uuid-here",
    "firebase_uid": "firebase-uid-here",
    "email": "user@example.com",
    "display_name": "Test User",
    "photo_url": "https://example.com/photo.jpg",
    "provider": "google",
    "created_at": "2023-05-03T12:00:00.000Z",
    "updated_at": "2023-05-03T12:00:00.000Z",
    "roles": [
      {
        "name": "user",
        "permissions": {
          "dashboard": {
            "read": true,
            "write": false
          },
          "profile": {
            "read": true,
            "write": true
          }
        }
      }
    ]
  }
}
```

**Response (Error):**
```json
{
  "status": "error",
  "message": "User not found"
}
```

**Status Codes:**
- `200 OK`: User found
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Not authorized to access this user
- `404 Not Found`: User not found
- `500 Internal Server Error`: Server error

---

#### PATCH /user/update

Update a user's profile information.

**Request:**
```
PATCH /user/update
Content-Type: application/json

{
  "uuid": "user-uuid-here",
  "payload": {
    "displayName": "Updated User Name",
    "photoUrl": "https://example.com/new-photo.jpg"
  }
}
```

**Response (Success):**
```json
{
  "status": "success",
  "message": "User updated successfully",
  "user": {
    "uuid": "user-uuid-here",
    "firebase_uid": "firebase-uid-here",
    "email": "user@example.com",
    "display_name": "Updated User Name",
    "photo_url": "https://example.com/new-photo.jpg",
    "provider": "google",
    "created_at": "2023-05-03T12:00:00.000Z",
    "updated_at": "2023-05-03T12:30:00.000Z",
    "roles": [
      {
        "name": "user",
        "permissions": {
          "dashboard": {
            "read": true,
            "write": false
          },
          "profile": {
            "read": true,
            "write": true
          }
        }
      }
    ]
  }
}
```

**Response (Error):**
```json
{
  "status": "error",
  "message": "Error message here"
}
```

**Status Codes:**
- `200 OK`: User updated successfully
- `400 Bad Request`: Invalid request body
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Not authorized to update this user
- `404 Not Found`: User not found
- `500 Internal Server Error`: Server error

---

### Session Management

#### GET /session/check

Check if the current session is valid.

**Request:**
```
GET /session/check
Cookie: connect.sid=YOUR_SESSION_COOKIE
```

**Response (Success):**
```json
{
  "status": "success",
  "message": "Session is valid",
  "user": {
    "uuid": "user-uuid-here",
    "role": "user"
  }
}
```

**Response (Error):**
```json
{
  "status": "error",
  "message": "Invalid or expired session"
}
```

**Status Codes:**
- `200 OK`: Session is valid
- `401 Unauthorized`: Invalid or expired session
- `500 Internal Server Error`: Server error

---

#### POST /session/validate

Validate a session by ID (for other services).

**Request:**
```
POST /session/validate
Content-Type: application/json

{
  "sessionId": "SESSION_ID"
}
```

**Response (Success):**
```json
{
  "status": "success",
  "session": {
    "uuid": "user-uuid-here",
    "user_profile": {
      "display_name": "Test User",
      "email": "user@example.com"
    },
    "role": {
      "name": "user",
      "permissions": {
        "dashboard": {
          "read": true,
          "write": false
        },
        "profile": {
          "read": true,
          "write": true
        }
      }
    }
  }
}
```

**Response (Error):**
```json
{
  "status": "error",
  "message": "Invalid or expired session"
}
```

**Status Codes:**
- `200 OK`: Session is valid
- `400 Bad Request`: Missing sessionId
- `401 Unauthorized`: Invalid or expired session
- `500 Internal Server Error`: Server error

---

#### POST /session/logout

Destroys the current user session.

**Request:**
```
POST /session/logout
Cookie: connect.sid=YOUR_SESSION_COOKIE
```

**Response (Success):**
```json
{
  "status": "success",
  "message": "Logged out successfully"
}
```

**Response (Error):**
```json
{
  "status": "error",
  "message": "Error during logout process"
}
```

**Status Codes:**
- `200 OK`: Successfully logged out or no session to logout
- `500 Internal Server Error`: Server error during logout

---

## Integration with Other Microservices

### Authentication Flow

1. **User Login**:
   - User authenticates through Firebase in the client application
   - Client gets Firebase token and calls `/user/create` endpoint
   - Auth service creates or retrieves user and establishes a session
   - Client receives session cookie

2. **Session Validation**:
   - Other microservices can validate sessions using the `/session/validate` endpoint
   - Pass the session ID received from client requests
   - Receive user information and permissions if session is valid

3. **Session Termination**:
   - Call `/session/logout` to terminate a user session
   - Clears the session from Redis and the client cookie

### Error Handling

All endpoints follow the same error response format:

```json
{
  "status": "error",
  "message": "Human-readable error message"
}
```

### Status Code Summary

- `200 OK`: Request succeeded
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid request (missing/invalid parameters)
- `401 Unauthorized`: Authentication required or failed
- `403 Forbidden`: Authenticated but not authorized
- `404 Not Found`: Resource not found
- `409 Conflict`: Resource already exists
- `500 Internal Server Error`: Server error

## CORS Configuration

For cross-origin requests, the auth service allows requests from:
- Frontend applications running on `localhost`
- Other microservices in the same environment

To integrate with the auth service from other microservices, make sure to include credentials in your requests:

```javascript
// Example using Axios
axios.get('http://localhost:3000/session/check', {
  withCredentials: true
});
``` 