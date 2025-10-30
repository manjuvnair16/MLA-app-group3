# Endpoint Authorization Guide

This document explains how **JWT (JSON Web Token)** authorization has been integrated into the project, what this means for development, and how to configure your local environment.

---

## 🔐 Overview

JWT authorization has been added to secure communication between the frontend, GraphQL gateway, and backend microservices.  
All protected endpoints now require a valid JWT in the **`Authorization`** header of incoming requests.

---

## ⚙️ Design Overview

- The **authservice** issues a JWT for the user upon successful login.
- The JWT is sent as **JSON in the response body** to the frontend.
- The **frontend stores** the JWT in `localStorage`.
- For any subsequent request, the frontend **includes the JWT** in the HTTP header:
```js
Authorization: Bearer <jwt_token>
```
- The **backend services** (`analytics`, `activity-tracking`, etc.) use a **JWT validation middleware** to:
    - Extract the token from the Authorization header.
    - Validate its signature using the **shared secret key**.
    - Reject requests with invalid or missing tokens.
- The **GraphQL Gateway** also validates the JWT and forwards it in the header when calling backend services. This is ready for when we start calling the gateway from the frontend.

The **secrey key** must be added to each service's `.env` or `application.properties` file and it should not be committed to git. Instructions are in the README for how to add the key to your local repository.

---

## 🚧 Protected Endpoints

All routes that handle user-specific or sensitive data should be protected by JWT authorization.

| Service | Example Protected Endpoints |
|----------|-----------------------------|
| `activity-tracking` | `/exercises/add` | 
| `analytics` | `/stats/`, `/api/activities/` etc |

**Publicly accessible routes**
The `/login`, `/signup` and `/health` endpoints remain publicly accessible

> **Note:** If you add a new endpoint that should only be accessible to authenticated users, you must make it **JWT-protected** (see below).

---

## 🧩 Adding a New Protected Endpoint

When developing new routes:

1. Specify that the route must have a token. For example:
    - In **analytics** `app.py`: The `@token_required` annotation must be added
    - In **activity-tracking** `server.js`: The authenticateJWT parameter must be supplied to each route, eg. `app.use('/exercises', authenticateJWT, exercisesRouter);`
    - In **graphql-gateway**:
        - In the resolver file, pass the **context** through the request, eg.
        ```js
         exercise: async (_, { id }, context) => {
            try {
            const result = await activityService.getExerciseById(id, context);
            return result;
        ```
        - In the datasource file, pass the **context** through the parameter and add the **context.Authheader** to each request, eg. 
        ```js
        async getExerciseById(id, context) {
            try {
            const response = await axios.get(`${this.baseURL}/exercises/${id}`, {
                headers: { Authorization: context.authHeader },
                timeout: 5000
            });
        ```
2. **Frontend:** Any request to protected routes must include:
 ```js
 const jwt = localStorage.getItem("jwt");
 const response = await fetch("/api/your-endpoint", {
   headers: { Authorization: `Bearer ${jwt}` }
 });
 ```