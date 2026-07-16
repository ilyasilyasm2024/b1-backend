# b1-backend

Express 5 + Mongoose 9 API for the B1 exam-prep app. Deployed serverless on Vercel.

## Development

```bash
npm install
npm start          # local server (requires MONGO_DB_URL in .env)
```

## Testing

The suite has two layers (315 tests total):

- **Unit tests** — fast, fully mocked, no database. Cover services, controllers,
  middlewares, validation schemas, the HTML sanitizer, and plan logic.
- **Integration tests** — run against a real in-memory MongoDB
  (`mongodb-memory-server`) through the full Express stack via `supertest`.
  They prove auth flows, NoSQL-injection/XSS defenses, data ownership isolation,
  pagination/indexes, and the subscribe concurrency lock (no duplicate commissions).

```bash
npm test               # everything (unit + integration)
npm run test:unit      # unit only (~3s)
npm run test:integration
npm run test:coverage  # coverage report
```

The first integration run downloads a MongoDB binary (cached afterwards).
Rate limiting and request logging are disabled when `NODE_ENV=test`.

## Reports

Scalability audit, recommendations, and the testing/trust report live in
[`rapports/`](./rapports).
