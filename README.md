# strgl

Zentrale Multi-Tenant-Plattform für digitale Produkte (WordPress-Plugins & Webapps): Accounts, Stripe-Billing, Domain-Lizenzen, deutsche Rechnungen, umstellbare MwSt./OSS-Tax-Engine.

## Stack

- Next.js (App Router) + TypeScript + shadcn/ui
- Neon Postgres + Drizzle ORM
- Better Auth
- Stripe + Resend
- Hosting: Vercel

## Setup (lokal gegen Live-Neon-DB)

1. `cp .env.local.example .env.local`
2. In Vercel → Env Vars den Wert von `STRGL_DATABASE_URL` (und `BETTER_AUTH_SECRET`) nach `.env.local` kopieren
3. `pnpm install`
4. Schema + Seed gegen Neon: `pnpm db:setup`
5. Dev-Server: `pnpm dev` → http://localhost:3001
6. Registrieren mit `SEED_ADMIN_EMAIL` (z.B. hj@strgl.de)
5. Produktion: Repo [hjherbst/strgl](https://github.com/hjherbst/strgl) → Vercel
6. In Vercel: `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL=https://strgl.de`
7. Neon↔Vercel legt bei diesem Projekt oft `STRGL_DATABASE_URL` an (nicht `DATABASE_URL`) — die App liest beides. Check: `curl -H "Authorization: Bearer $BETTER_AUTH_SECRET" https://strgl.de/api/debug/db`
8. Nach erstem Deploy einmal Schema+Seed:

```bash
curl -X POST https://strgl.de/api/setup \
  -H "Authorization: Bearer DEIN_BETTER_AUTH_SECRET"
```

9. Account registrieren, dann Admin setzen:

```bash
SEED_ADMIN_EMAIL=deine@mail.de pnpm db:seed
```

10. Stripe Webhook auf `/api/webhooks/stripe` zeigen (lokal: Stripe CLI).

## Wichtige APIs

- `POST /api/v1/licenses/validate` – Plugin-Lizenz + Domain
- `GET /api/v1/entitlements/:productSlug` – Webapp Paid/Freemium (Session)
- `POST /api/v1/credits/balance` – AI-Credit-Saldo (licenseKey + domain)
- `POST /api/v1/credits/consume` – Credits abziehen (Idempotenz-Key)
- `POST /api/v1/ai/storyboards/{stage}` – Storyboards AI-Proxy (intake, story-core, expand, shotlist, edit-plan, guardrails, scene-*)
- `POST /api/checkout` – Stripe Checkout
- `POST /api/webhooks/stripe` – Entitlements / Credits / Rechnungen

### Storyboards AI Credits

Produkt-Slug `storyboards` (Seed). Credit-Packs setzen `plans.credits_amount`. Kauf gutschreibt Wallet + stellt bei Plugins eine Domain-Lizenz aus. Optional `STORYBOARDS_OPENAI_API_KEY` / `STORYBOARDS_OPENAI_MODEL` für echte Generierung; sonst Stub-Pipeline. Produktkatalog: `/products`, Kaufoptionen: `/products/storyboards`.

## Admin

`/admin` – Firma & Tax-Mode, Produkte, Kunden, EU-B2C-Schwellenanzeige.

## Tax-Modes (pro Tenant)

- `home_vat_below_threshold` (Default): EU-B2C mit Heimat-MwSt.; EU-B2B + gültige USt-IdNr. → Reverse Charge
- `oss`: vorbereitet für Zielland-MwSt.
- `home_b2c_only`: Privatkunden nur Heimatland-Adresse
