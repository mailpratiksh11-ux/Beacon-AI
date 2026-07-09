# ColdMailer AI — Backend

REST API for the ColdMailer AI cold-email platform. Built with **Node.js + Express + MongoDB (Mongoose)** using a clean **route → controller → service → model** layered architecture.

## Stack

- **Express 4** (ESM)
- **Mongoose 8** → MongoDB Atlas
- **helmet**, **cors**, **compression**, **morgan** middleware
- Centralized error handling + async wrapper + standard response envelope

## Getting started

```bash
cd backedn
npm install
cp .env.example .env    # then fill in MONGODB_URI (already set for this project)
npm run seed            # populate Atlas with starter data
npm run dev             # nodemon → http://localhost:5050
# or
npm start
```

> The server runs on **port 5050** (5000 is taken by macOS AirPlay Receiver).

## Architecture

```
src/
  server.js              # bootstrap: connect DB, listen, graceful shutdown
  app.js                 # express app, middleware, mounts /api
  seed.js                # populate DB with sample data
  config/
    env.js               # validated env vars
    db.js                # mongoose connection
  models/                # Mongoose schemas
    campaign.model.js  email.model.js  template.model.js  contact.model.js
  services/              # business logic + DB access (no req/res here)
    campaign.service.js  email.service.js  template.service.js
    contact.service.js   dashboard.service.js
  controllers/           # parse req → call service → send response
    campaign.controller.js  email.controller.js  template.controller.js
    contact.controller.js   dashboard.controller.js
  routes/                # URL → controller mapping
    index.js  campaign.routes.js  email.routes.js
    template.routes.js  contact.routes.js  dashboard.routes.js
  middleware/
    error.middleware.js  # notFound + centralized errorHandler
  utils/
    ApiError.js  ApiResponse.js  asyncHandler.js
```

**Layer responsibilities**
- **Route** — declares the endpoint and HTTP method, points to a controller.
- **Controller** — reads `req` (params/query/body), calls a service, returns a formatted response. No DB logic.
- **Service** — all business logic and Mongoose queries. Reusable, testable, framework-agnostic.
- **Model** — schema, validation, indexes.

## API reference

Base URL: `http://localhost:5050`

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | `/health` | Liveness check |
| GET | `/api` | API info |
| GET | `/api/dashboard/stats` | Sent today / pending / failed / contacts |
| GET | `/api/dashboard/recent-campaigns` | Latest campaigns |
| GET | `/api/dashboard/analytics` | Delivery/open/failure rates + breakdown |
| GET | `/api/campaigns` | List (`?status=&search=&page=&limit=`) |
| POST | `/api/campaigns` | Create |
| GET/PATCH/DELETE | `/api/campaigns/:id` | Read / update / delete |
| POST | `/api/campaigns/:id/duplicate` | Duplicate |
| GET | `/api/emails` | Email history (`?status=&search=&page=&limit=`) |
| POST | `/api/emails` | Log an email |
| GET/DELETE | `/api/emails/:id` | Read / delete |
| GET/POST | `/api/templates` | List / create |
| GET/PATCH/DELETE | `/api/templates/:id` | Read / update / delete |
| POST | `/api/templates/:id/duplicate` | Duplicate |
| GET/POST | `/api/contacts` | List / create |
| POST | `/api/contacts/import` | Bulk import `{ contacts: [...] }` (upsert by email) |
| GET/PATCH/DELETE | `/api/contacts/:id` | Read / update / delete |

### Response shape

```jsonc
// success
{ "success": true, "message": "OK", "data": { /* ... */ } }
// paginated
{ "success": true, "data": [ /* ... */ ], "pagination": { "page": 1, "limit": 8, "total": 12, "totalPages": 2 } }
// error
{ "success": false, "message": "Validation failed", "details": [ /* ... */ ] }
```

## Connecting the frontend

The Angular app expects the API at `http://localhost:5050`. CORS already allows `http://localhost:4200`. Point the frontend's `DataService` at these endpoints to replace the mock signals.

## Security note

`.env` (with the Atlas credentials) is gitignored. Since the connection string was shared in plaintext, consider rotating the DB password and restricting Atlas network access to trusted IPs before going to production.
