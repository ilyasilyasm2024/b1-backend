# Testing & Trust Report

Datum: 2026-07-16
Ziel: Nachweisbares Vertrauen in das Backend auf allen Ebenen.

## Überblick

| Ebene | Anzahl | Framework | Datenbank |
|-------|--------|-----------|-----------|
| Unit-Tests | 282 | Jest (mocks) | gemockt |
| Integrationstests | 42 | Jest + Supertest | echte In-Memory-MongoDB |
| **Gesamt** | **324** | | |

> Siehe auch `04-production-testing-blueprint.md` für die vollständige
> QA-Blueprint (Unit/Integration/E2E/Load/Security) inkl. k6-Konfiguration und
> Security-Audit-Skript.

Ausführung:
```bash
npm test               # alles (unit + integration)
npm run test:unit      # nur Unit (schnell, ~3s, keine DB)
npm run test:integration  # nur Integration (echte DB im Speicher)
npm run test:coverage  # Unit-Coverage-Report
```

---

## Was die Unit-Tests abdecken (Logik isoliert)

- **Services** (auth, user, affiliate, notes, vocabulary, progress) — 86–100 %
- **Controllers** (alle 8) — 87–97 % (Statuscodes 200/201/400/401/404/500)
- **Middlewares** (auth, admin, influencer) — 100 %
- **Validierungen** (Joi-Schemas) — 100 %
- **HTML-Sanitizer** — 100 % (Script-Stripping, `javascript:`-Blockierung, Style-Allowlist)
- **Plans-Config** — 100 % (Preise, Limits, Ablauf-Logik)

Kritische Fälle: Streak-Logik, Erst- vs. Verlängerungs-Provision, Referral-
Rabatte, Promo-Monatslimit, Payout-Summen, Feld-Allowlist bei
`updateInfluencer` (kein Einschleusen von `balance`/`totalEarned`).

---

## Was die Integrationstests BEWEISEN (echte DB + echtes HTTP)

Diese Tests laufen gegen eine echte MongoDB (mongodb-memory-server) über den
echten Express-Stack via Supertest — also echte Queries, Indizes und Middleware.

### 1. Auth-Flow (`auth.int.test.js`)
- Signup persistiert (unverifiziert, Passwort gehasht, plan=beta)
- Duplikat-Username/E-Mail werden abgelehnt
- Login vor Verifizierung blockiert → nach Token-Verifizierung erfolgreich
- Kompletter Passwort-Reset-Flow

### 2. Sicherheit (`security.int.test.js`)
- Geschützte Routen ohne/mit ungültigem Token → 401
- **NoSQL-Injection**: `$ne`-Operatoren im Body werden entfernt → Login-Bypass unmöglich
- HTML-Tags werden aus normalen String-Feldern entfernt
- Notizen behalten erlaubte Formatierung, aber Scripts werden entfernt (Allowlist)
- Ungültige Hex-Farbe → 400
- Überlange Payload → 413 (kein Speichern)

### 3. Nebenläufigkeit (`subscribe-concurrency.int.test.js`) — DER WICHTIGSTE
- **10 parallele Subscribe-Requests desselben Nutzers → GENAU EINE Provision**
  Beweist, dass der atomare Lease-Lock die Doppelauszahlungs-Race verhindert.
- Balance des Influencers = exakt eine Provision (22,5 MAD)
- Zwei echte sequenzielle Käufe → Erst-Provision (50 %) dann Verlängerung (20 %)

### 4. Affiliate-End-to-End (`affiliate.int.test.js`)
- Admin-Secret erzwungen (403 ohne)
- Influencer-Erstellung gibt nie das Passwort zurück
- `updateInfluencer` ignoriert geschützte Felder (balance bleibt 0)
- Referral-Code-Validierung öffentlich; referrierter Signup wird verknüpft
- Influencer-Login + Dashboard-Aggregation
- Promo generieren → Nutzer löst ein → zweite Einlösung schlägt fehl (Single-Use)

### 5. Datenschicht (`data-layer.int.test.js`)
- Unique-Indizes für username/email auf DB-Ebene erzwungen
- Pagination: korrekte Shape (`items/total/pages/page`), Limit-Cap bei 200, Seite 2
- `.lean()` liefert echte Plain-Objects
- **Besitz-Isolation**: Nutzer A kann Notizen von Nutzer B weder lesen, ändern noch löschen (404)
- Deklarierte Indizes existieren tatsächlich auf den Collections

---

## Damit nachgewiesen (Vertrauen)

✅ Auth & Autorisierung funktionieren gegen echte DB
✅ Race Condition beim Kauf ist real verhindert (parallel getestet)
✅ Injection/XSS-Schutz greift end-to-end
✅ Mandanten-/Besitz-Trennung der Daten
✅ Pagination & Indizes wirken wie entworfen
✅ Provisions-Berechnung (erst/Verlängerung, Rabatt) korrekt

## Was Tests NICHT ersetzen können

- **Last-/Stresstest** mit echten 10k Nutzern (k6/Artillery) — siehe `02-recommendations.md`
- Verhalten des echten Atlas-Clusters (Tier, Netzwerk, Failover)
- Verteiltes Rate-Limiting im echten Serverless-Betrieb (im Test deaktiviert,
  in Produktion aktiv über MongoDB-Store)
