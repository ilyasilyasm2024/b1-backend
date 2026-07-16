# Backend Scalability Audit — 5.000 bis 10.000 Nutzer

Datum: 2026-07-16
Umfang: `b1-backend` (Express 5 + Mongoose 9, deployed serverless auf Vercel)

Dieser Bericht listet jedes gefundene Problem, seine Auswirkung bei 5.000–10.000
Nutzern, und die angewandte Lösung (mit dem etablierten Muster/Pattern, nicht
hardcoded). Alle Fixes wurden in diesem Commit umgesetzt — siehe Abschnitt
"Status" bei jedem Punkt.

---

## Zusammenfassung (Severity-Übersicht)

| # | Problem | Severity | Status |
|---|---------|----------|--------|
| 1 | Kein Connection-Caching (serverless connection storm) | 🔴 Kritisch | Behoben |
| 2 | Kein Connection-Pool konfiguriert | 🔴 Kritisch | Behoben |
| 3 | Fehlende Datenbank-Indizes | 🔴 Kritisch | Behoben |
| 4 | `recordPurchase` lädt ALLE Commissions (O(n) je Kauf) | 🟠 Hoch | Behoben |
| 5 | Blockierender E-Mail-Versand im Signup | 🟠 Hoch | Behoben |
| 6 | Keine `.lean()` bei reinen Lesezugriffen | 🟠 Hoch | Behoben |
| 7 | Keine Pagination bei List-Endpoints | 🟠 Hoch | Behoben |
| 8 | Dashboard lädt alle Docs in den Speicher | 🟡 Mittel | Behoben |
| 9 | Race Conditions (check-then-act) bei Promo/Subscribe | 🟡 Mittel | Behoben |
| 10 | In-Memory Rate Limiting (nicht verteilt) | 🟡 Mittel | Dokumentiert + Muster empfohlen |
| 11 | Vokabel-Duplizierung (Collection + eingebettetes Array) | 🟢 Niedrig | Dokumentiert |

---

## 1. Kein Connection-Caching — Serverless Connection Storm 🔴

**Datei:** `src/app.js`, `src/config/database.js`

**Problem:** Bei jedem Request prüft eine Middleware `mongoose.connection.readyState`
und ruft bei Bedarf `mongoose.connect()` auf. In einer serverless Umgebung
(Vercel) wird pro gleichzeitigem Cold-Start eine neue Lambda-Instanz gestartet.
Ohne gecachtes Connection-Promise ruft **jeder gleichzeitige Request auf einer
neuen Instanz** `connect()` erneut auf.

**Auswirkung bei 5.000–10.000 Nutzern:** Bei Lastspitzen (z. B. morgens, wenn alle
lernen) starten Dutzende Lambdas gleichzeitig. Jede öffnet mehrere Verbindungen →
MongoDB Atlas erreicht sein Connection-Limit (M10 ≈ 1500 Verbindungen) →
`connection refused` / 503-Fehler. Das ist das klassische "thundering herd"-Problem.

**Lösung — Cached-Connection-Promise-Pattern** (Standard für serverless Mongo,
von Vercel/MongoDB offiziell empfohlen): Das Connection-Promise wird global auf
`globalThis` gecacht und über alle Requests derselben Instanz wiederverwendet.
Parallele Requests warten auf dasselbe Promise statt neue Verbindungen zu öffnen.

---

## 2. Kein Connection-Pool konfiguriert 🔴

**Datei:** `src/config/database.js`

**Problem:** `mongoose.connect(url)` ohne Optionen nutzt Defaults. `maxPoolSize`
ist standardmäßig 100 pro Instanz — in serverless multipliziert sich das mit der
Anzahl Instanzen und sprengt das Atlas-Limit.

**Lösung — explizite Pool-Konfiguration:** `maxPoolSize` klein halten (10) für
serverless, `minPoolSize`, `serverSelectionTimeoutMS`, `socketTimeoutMS` gesetzt.
Kleiner Pool pro Instanz × viele Instanzen bleibt unter dem Atlas-Limit.

---

## 3. Fehlende Datenbank-Indizes 🔴

**Dateien:** `user.model.js`, `vocabulary.model.js`, `notes.model.js`, Affiliate-Modelle

**Problem:** Häufig abgefragte Felder haben keinen Index. Ohne Index macht MongoDB
einen **Collection Scan** (COLLSCAN) — es liest jedes Dokument.

Betroffene Queries:
- `findByUsernameOrEmail` (`$or` username/email) — bei jedem Login
- `Vocabulary.find({ userId })` — bei jedem Vokabel-Abruf
- `Note.find({ userId })`
- `Referral.find({ userId })`, Commission-Lookups nach `influencerId`

**Auswirkung bei 5.000–10.000 Nutzern:** Ein Login-Scan über 10.000 User-Dokumente
statt eines B-Tree-Lookups → Login-Latenz steigt von <5 ms auf 50–200 ms und
skaliert linear mit der Nutzerzahl. Unter Last blockiert das die Event-Loop von
MongoDB.

**Lösung — explizite Indizes** (`schema.index(...)`):
- User: Index auf `username`, `email` (unique deckt das teils ab, aber explizit +
  `referredBy` für Affiliate-Lookups), sowie Tokens für Verify/Reset-Flows.
- Vocabulary: `{ userId: 1, createdAt: -1 }` (Compound für Liste + Sortierung).
- Note: `{ userId: 1, order: 1 }`.
- Commission: Compound `{ influencerId: 1, status: 1, period: 1 }` und
  `{ influencerId: 1, userId: 1 }` für die Kauf-Prüfung.

---

## 4. `recordPurchase` lädt ALLE Commissions je Kauf 🟠

**Datei:** `src/modules/affiliate/affiliate.service.js`

**Problem:** Um zu prüfen, ob ein Nutzer schon einmal gekauft hat, wurde
`listCommissionsByInfluencer` aufgerufen (lädt **alle** Commissions eines
Influencers) und dann in JS mit `.some()` gefiltert. O(n) Daten pro Kauf.

**Auswirkung:** Ein beliebter Influencer mit tausenden Käufen → jeder neue Kauf
lädt tausende Dokumente in den Speicher, nur um einen Bool zu bestimmen.

**Lösung — `exists()` / `countDocuments()` mit Index:** Eine einzelne indizierte
`Commission.exists({ influencerId, userId })`-Abfrage statt Vollscan + JS-Filter.

---

## 5. Blockierender E-Mail-Versand im Signup 🟠

**Datei:** `src/modules/auth/auth.service.js`

**Problem:** `await sendVerificationEmail(...)` blockiert die Signup-Antwort, bis
der SMTP-Server geantwortet hat (oft 1–5 s, manchmal Timeout).

**Auswirkung:** Bei vielen gleichzeitigen Registrierungen halten hängende
SMTP-Verbindungen Lambda-Ausführungen offen → höhere Kosten, langsamere Antworten,
Timeouts. Der Nutzer wartet unnötig.

**Lösung — Fire-and-Forget mit Fehler-Logging:** E-Mail wird nach dem Speichern
des Nutzers asynchron abgeschickt (nicht awaited), Fehler werden geloggt. Die
Signup-Antwort kommt sofort. (Für harte Zustellgarantien wäre eine Queue wie
BullMQ/SQS das nächste Level — als Empfehlung dokumentiert.)

---

## 6. Keine `.lean()` bei reinen Lesezugriffen 🟠

**Dateien:** Repositories (user, notes, vocabulary, affiliate)

**Problem:** Mongoose hydriert per Default volle Dokumente mit Gettern/Settern/
Virtuals/Change-Tracking. Für reine Lesezugriffe (Listen, Dashboards) ist das
verschwendete CPU und Speicher.

**Auswirkung:** Bei List-Endpoints mit tausenden Objekten kostet die Hydrierung
messbar CPU auf jeder Lambda. `.lean()` liefert Plain-JS-Objekte — bis zu 5x
schneller bei großen Result-Sets.

**Lösung:** `.lean()` bei allen reinen Read-Queries (Listen, Dashboard, Validierung).

---

## 7. Keine Pagination bei List-Endpoints 🟠

**Dateien:** `user.repository.js` (`findAll`), Affiliate-Listen

**Problem:** `User.find()` gibt **alle** Nutzer zurück. Bei 10.000 Nutzern ist das
ein riesiger Payload.

**Auswirkung:** Ein einzelner Admin-Aufruf lädt 10.000 Dokumente → mehrere MB
Response, hoher Speicher, langsame Serialisierung, evtl. Lambda-Memory-Limit.

**Lösung — Standard Skip/Limit-Pagination** mit sinnvollem Default-Limit und
`countDocuments` für die Gesamtanzahl. (Für sehr große Datenmengen wäre
Cursor-/Keyset-Pagination noch besser — dokumentiert.)

---

## 8. Dashboard lädt alle Dokumente in den Speicher 🟡

**Datei:** `src/modules/affiliate/affiliate.service.js` (`getDashboard`)

**Problem:** Es werden alle Referrals und alle Commissions geladen und die
Statistiken (Summen, Zähler) in JavaScript berechnet.

**Lösung — Aggregation-Pipeline:** Summen/Counts werden von MongoDB via
`$group`/`$sum` berechnet; nur die zur Anzeige nötigen Listen werden (paginiert +
`.lean()`) geladen. Das verschiebt die Rechenlast in die DB und minimiert Transfer.

---

## 9b. Subscribe-Flow Doppel-Commission — ✅ Behoben

**Datei:** `src/modules/user/user.service.js`, `user.repository.js`, `user.model.js`

**Problem:** Der `subscribe`-Flow war ein Read-then-Write über zwei Collections
ohne Transaktion. Zwei gleichzeitige Requests desselben Nutzers (Doppelklick)
konnten zwei Commission-Datensätze erzeugen → doppelte Auszahlung.

**Lösung — atomarer Lease-Lock:** Vor der Verarbeitung wird via
`findOneAndUpdate` ein kurzlebiger Lock (`subscribeLockAt`) atomar gesetzt. Ein
zweiter paralleler Request bekommt den Lock nicht und wird abgewiesen. Der Lock
ist selbstheilend (läuft nach 30 s ab, falls ein Request abstürzt) und wird im
`finally` freigegeben. Kein Replica-Set / keine Transaktion nötig.

## 9. Race Conditions (check-then-act) 🟡

**Dateien:** `affiliate.service.js` (`redeemPromoCode`, `generatePromoCode`)

**Problem:** Muster wie „prüfe ob Code unbenutzt → dann markiere benutzt" sind
zwischen Prüfung und Schreiben angreifbar (zwei parallele Requests lösen denselben
Code ein).

**Lösung — atomare Operationen:** Promo-Einlösung nutzt bereits
`findOneAndUpdate({ code, isUsed: false }, { isUsed: true })` — das ist atomar und
korrekt. Die vorgelagerte Lese-Prüfung dient nur besseren Fehlermeldungen; die
Autorität liegt beim atomaren Update (dokumentiert und beibehalten). Balance-
Updates nutzen bereits `$inc` (atomar).

---

## 10. In-Memory Rate Limiting 🟡

**Datei:** `src/app.js`

**Problem:** `express-rate-limit` nutzt per Default einen In-Memory-Store. In
serverless hat jede Instanz ihren eigenen Zähler → das globale Limit wird nicht
durchgesetzt.

**Auswirkung:** Ein Angreifer, dessen Requests auf viele Instanzen verteilt werden,
umgeht das Limit effektiv. Bei 5.000–10.000 Nutzern verteilt der Load-Balancer
ohnehin auf viele Instanzen.

**Empfohlenes Muster:** Shared Store — `rate-limit-mongo` (nutzt die vorhandene
MongoDB, keine neue Infrastruktur) oder Redis (`rate-limit-redis`, z. B. Upstash
für serverless). Beispielkonfiguration in `02-recommendations.md`.

---

## 11. Vokabel-Duplizierung 🟢

**Dateien:** `user.model.js` (`vocabularyList`), `vocabulary.model.js`

**Problem:** Vokabeln existieren sowohl als eingebettetes Array im User-Dokument
als auch als eigene Collection. Doppelte Datenhaltung → Konsistenzrisiko und
aufgeblähte User-Dokumente (16-MB-Limit bei Power-Usern).

**Empfehlung:** Eine Quelle der Wahrheit — die `Vocabulary`-Collection behalten,
das eingebettete Array entfernen (Migration nötig, daher nur dokumentiert, nicht
automatisch geändert).
