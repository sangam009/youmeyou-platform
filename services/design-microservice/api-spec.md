# Design Microservice API Specification

## Authentication
All endpoints require a valid session with a `userId`. If the session is missing or invalid, a 401 Unauthorized response will be returned.

## Health Check
- **GET** `/health`
- **Response:**
  ```json
  { "status": "ok" }
  ```

## Workspaces

### List Workspaces
- **GET** `/workspaces`
- **Response:** List of workspaces for the authenticated user.
- **Example Response:**
  ```json
  [
    { "id": 1, "name": "kafeneo", "userId": "dummy-user-id" },
    { "id": 2, "name": "codaloo", "userId": "dummy-user-id" }
  ]
  ```

### Create Workspace
- **POST** `/workspaces`
- **Request Body:**
  ```json
  { "name": "New Workspace" }
  ```
- **Response:** Created workspace.
- **Example Response:**
  ```json
  { "id": 3, "name": "New Workspace", "userId": "dummy-user-id" }
  ```

### Switch Workspace
- **POST** `/workspaces/:id/switch`
- **Response:** Confirmation of workspace switch.
- **Example Response:**
  ```json
  { "status": "switched", "workspaceId": 1 }
  ```

### Invite to Workspace
- **POST** `/workspaces/:id/invite`
- **Request Body:**
  ```json
  { "email": "user@example.com" }
  ```
- **Response:** Confirmation of invitation.
- **Example Response:**
  ```json
  { "status": "invited", "workspaceId": 1, "email": "user@example.com" }
  ```

## Projects

### List Projects
- **GET** `/workspaces/:id/projects`
- **Response:** List of projects in the specified workspace.
- **Example Response:**
  ```json
  [
    { "id": 1, "name": "System Design", "workspaceId": 1, "userId": "dummy-user-id", "createdAt": "2024-06-01T12:00:00Z", "updatedAt": "2024-06-01T12:00:00Z" }
  ]
  ```

### Create Project
- **POST** `/workspaces/:id/projects`
- **Request Body:**
  ```json
  { "name": "New Project" }
  ```
- **Response:** Created project.
- **Example Response:**
  ```json
  { "id": 2, "name": "New Project", "workspaceId": 1, "userId": "dummy-user-id", "createdAt": "2024-06-01T12:00:00Z", "updatedAt": "2024-06-01T12:00:00Z" }
  ```

### Rename Project
- **PATCH** `/projects/:id`
- **Request Body:**
  ```json
  { "name": "Updated Project Name" }
  ```
- **Response:** Updated project.
- **Example Response:**
  ```json
  { "id": 1, "name": "Updated Project Name" }
  ```

### Delete Project
- **DELETE** `/projects/:id`
- **Response:** Confirmation of deletion.
- **Example Response:**
  ```json
  { "status": "deleted", "id": 1 }
  ```

## Templates

### List Templates for a Project
- **GET** `/templates/:projectId`
- **Response:** List of templates for the specified project.
- **Example Response:**
  ```json
  [
    { "id": "665f1c2e2f8b9a6c1a2b3c4d", "name": "API Template", "projectId": 1, "data": { "nodes": [], "edges": [] }, "createdAt": "2024-06-01T12:00:00Z", "updatedAt": "2024-06-01T12:00:00Z" }
  ]
  ```

### Create Template
- **POST** `/templates`
- **Request Body:**
  ```json
  { "name": "New Template", "projectId": 1, "data": { "nodes": [], "edges": [] } }
  ```
- **Response:** Created template.
- **Example Response:**
  ```json
  { "id": "665f1c2e2f8b9a6c1a2b3c4d", "name": "New Template", "projectId": 1, "data": { "nodes": [], "edges": [] }, "createdAt": "2024-06-01T12:00:00Z", "updatedAt": "2024-06-01T12:00:00Z" }
  ```

### Update Template
- **PATCH** `/templates/:id`
- **Request Body:**
  ```json
  { "name": "Updated Template", "data": { "nodes": [], "edges": [] } }
  ```
- **Response:** Updated template.
- **Example Response:**
  ```json
  { "id": "665f1c2e2f8b9a6c1a2b3c4d", "name": "Updated Template", "data": { "nodes": [], "edges": [] } }
  ```

### Delete Template
- **DELETE** `/templates/:id`
- **Response:** Confirmation of deletion.
- **Example Response:**
  ```json
  { "status": "deleted", "id": "665f1c2e2f8b9a6c1a2b3c4d" }
  ``` 