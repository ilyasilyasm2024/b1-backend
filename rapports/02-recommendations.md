# Empfehlungen für weiteres Skalieren (über die angewandten Fixes hinaus)

Diese Punkte erfordern zusätzliche Infrastruktur oder Migrationen und wurden
daher nicht automatisch angewendet, sondern hier als klare Handlungsanleitung
dokumentiert.

---

## 1. Verteiltes Rate Limiting (Shared Store) — ✅ IMPLEMENTIERT (Option A)

Umgesetzt mit `rate-limit-mongo`: beide Limiter (global + auth) nutzen jetzt einen
gemeinsamen MongoDB-Store (`rateLimitGlobal` / `rateLimitAuth`), sodass Limits über
alle serverless Instanzen hinweg durchgesetzt werden. Bei ~50k Nutzern auf Redis
(Option B) wechseln.

Der In-Memory-Store von `express-rate-limit` funktioniert in serverless nicht
verteilt. Zwei etablierte Optionen:

### Option A — MongoDB-Store (keine neue Infrastruktur)
```bash
npm install rate-limit-mongo
```
```js
const MongoStore = require('rate-limit-mongo');

const limiter = rateLimit({
  store: new MongoStore({
    uri: process.env.MONGO_DB_URL,
    collectionName: 'rateLimits',
    expireTimeMs: 15 * 60 * 1000,
  }),
  windowMs: 15 * 60 * 1000,
  max: 700,
});
```

### Option B — Redis (beste Performance, z. B. Upstash serverless)
```bash
npm install rate-limit-redis ioredis
```
```js
const RedisStore = require('rate-limit-redis');
const Redis = require('ioredis');
const client = new Redis(process.env.REDIS_URL);

const limiter = rateLimit({
  store: new RedisStore({ sendCommand: (...args) => client.call(...args) }),
  windowMs: 15 * 60 * 1000,
  max: 700,
});
```
Empfehlung: Bei aktueller Größe Option A (MongoDB); ab ~50k Nutzern auf Redis
wechseln.

---

## 2. E-Mail-Queue statt Fire-and-Forget

Der aktuelle Fix macht den E-Mail-Versand nicht-blockierend, garantiert aber keine
Zustellung bei SMTP-Ausfall. Für harte Garantien:
- **BullMQ + Redis** (self-hosted) oder
- **Amazon SQS + Lambda-Worker** oder
- Ein transaktionaler Mail-Provider mit eigener Queue (Resend, SendGrid, Postmark).

Muster: Signup schreibt einen Job in die Queue; ein Worker versendet mit Retry +
Dead-Letter-Queue.

---

## 3. Vokabel-Datenmodell konsolidieren

`user.vocabularyList` (eingebettet) und die `Vocabulary`-Collection halten dieselben
Daten doppelt. Migration:
1. Sicherstellen, dass alle eingebetteten Vokabeln in der Collection existieren.
2. Frontend/Services auf die Collection umstellen.
3. `vocabularyList` aus dem User-Schema entfernen (mit Migrationsskript).

Vorteil: kein 16-MB-Dokumentlimit-Risiko, keine Konsistenzprobleme.

---

## 4. Read-Skalierung

Ab ~50k aktiven Nutzern:
- **MongoDB Atlas Read Replicas** + `readPreference: 'secondaryPreferred'` für
  reine Lese-Endpoints (Dashboard, Listen).
- **Caching-Layer** (Redis) für selten wechselnde Daten (Influencer-Code-Validierung,
  Plan-Preise).

---

## 5. Observability

- `morgan('combined')` loggt in stdout — für Produktion strukturiertes Logging
  (pino) + zentrale Sammlung (Datadog/Logtail).
- Atlas Performance Advisor aktivieren — schlägt fehlende Indizes automatisch vor.
- Slow-Query-Logging aktivieren (`profile` level 1).
