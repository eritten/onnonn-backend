# onnonn-backend

Onnonn is an AI-powered meeting platform backend built with Node.js, Express, MongoDB, Redis, LiveKit, Stripe, and OpenAI.

## Tech Stack

- Node.js + Express
- MongoDB + Mongoose
- Redis + Bull queues
- LiveKit
- Stripe
- OpenAI
- Firebase Cloud Messaging
- Nodemailer
- Swagger / OpenAPI

## Local Setup

1. Install Node.js 22+, MongoDB, and Redis.
2. Copy `.env.example` to `.env` and fill in credentials.
3. Install dependencies with `npm install`.
4. Start the app with `npm run dev`.
5. Open Swagger UI at `http://localhost:4000/api/docs`.

## Scripts

- `npm run dev` starts the development server.
- `npm run seed` seeds realistic local data.
- `npm test` runs the full test suite.
- `npm run test:coverage` runs coverage with thresholds enforced.

## Docker

Run `docker compose up --build` to start the backend, MongoDB, and Redis.

## API

- Health: `/health`
- Swagger UI: `/api/docs`
- OpenAPI JSON: `/api/docs.json`
- API prefix: `/api/v1`

## Deployment Notes

- Provide all environment variables from `.env.example`.
- Use a managed MongoDB deployment with Atlas vector search enabled for semantic search.
- Configure Redis persistence or a managed Redis service for queues and transient meeting state.
- Set webhook URLs for Stripe and LiveKit to the deployed backend.
- Enable HTTPS and a production mail provider before go-live.
