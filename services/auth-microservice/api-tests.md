# Auth Service API Test Commands

This file contains cURL commands that can be used to test the Auth Service API endpoints. You can run these commands from the terminal or import them into Postman.

## Health Check

Check if the auth service is running:

```bash
curl -X GET http://localhost:3000/health
```

## User Management

### Create User (Login)

Create a new user after Firebase authentication:

```bash
curl -X POST http://localhost:3000/user/create \
  -H "Content-Type: application/json" \
  -d '{
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
  }'
```

**Note:** Replace the placeholder values with actual Firebase tokens. These tokens can be obtained after Firebase authentication in the browser.

### Get User Profile

Get a user's profile information:

```bash
curl -X GET http://localhost:3000/user/USER_UUID \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE"
```

### Update User Profile

Update a user's profile information:

```bash
curl -X PATCH http://localhost:3000/user/update \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE" \
  -d '{
    "uuid": "USER_UUID",
    "payload": {
      "displayName": "Updated User Name",
      "photoUrl": "https://example.com/new-photo.jpg"
    }
  }'
```

## Session Management

### Check Current Session

Check if the current session is valid:

```bash
curl -X GET http://localhost:3000/session/check \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE"
```

### Validate Session

Validate a session by ID (for other services):

```bash
curl -X POST http://localhost:3000/session/validate \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "SESSION_ID"
  }'
```

## How to Get Session Cookies

To get the session cookie for testing:

1. Login through the React test UI
2. Open browser developer tools (F12)
3. Go to the Application tab (Chrome) or Storage tab (Firefox)
4. Look for Cookies in the left panel
5. Find the `connect.sid` cookie
6. Copy the value (without the `s%3A` prefix)

## Postman Collection

You can import these requests into Postman by:

1. Creating a new collection
2. For each endpoint, create a new request
3. Set the request type (GET, POST, PATCH)
4. Set the URL (e.g., http://localhost:3000/health)
5. Add any headers and body data as specified in the cURL commands
6. For requests requiring cookies, add a Cookie header with `connect.sid=YOUR_SESSION_COOKIE`

## Test Sequence

For a complete test flow:

1. Start the auth service using `./start-dev.sh`
2. Verify service is running with health check
3. Login via the UI to get a session cookie
4. Test the user profile endpoint
5. Test updating the user profile
6. Test session validation endpoints 