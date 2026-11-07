# strgl

Zentrale Multi-Tenant-Plattform für digitale Produkte (WordPress-Plugins & Webapps): Accounts, Stripe-Billing, Domain-Lizenzen, deutsche Rechnungen, umstellbare MwSt./OSS-Tax-Engine.

## Stack

- Next.js (App Router) + TypeScript + shadcn/ui
- Neon Postgres + Drizzle ORM
- Better Auth
- Stripe + Resend
- Hosting: Vercel

## Setup

1. `.env` aus `.env.example` anlegen (Neon `DATABASE_URL`, Stripe, Resend, Auth-Secret).
2. Dependencies: `pnpm install`
3. Schema push: `pnpm db:push`
4. Seed Tenant (Tidenhub / strgl): `pnpm db:seed`
5. Dev-Server: `pnpm dev` (Port **3001**)
6. Produktion: Repo [hjherbst/strgl](https://github.com/hjherbst/strgl) → Vercel (Deploy bei Push auf `main`)
7. Account registrieren, dann Admin setzen:

```bash
SEED_ADMIN_EMAIL=deine@mail.de pnpm db:seed
```

8. Stripe Webhook auf `/api/webhooks/stripe` zeigen (lokal: Stripe CLI).

## Wichtige APIs

- `POST /api/v1/licenses/validate` – Plugin-Lizenz + Domain
- `GET /api/v1/entitlements/:productSlug` – Webapp Paid/Freemium (Session)
- `POST /api/checkout` – Stripe Checkout
- `POST /api/webhooks/stripe` – Entitlements / Rechnungen

## Admin

`/admin` – Firma & Tax-Mode, Produkte, Kunden, EU-B2C-Schwellenanzeige.

## Tax-Modes (pro Tenant)

- `home_vat_below_threshold` (Default): EU-B2C mit Heimat-MwSt.; EU-B2B + gültige USt-IdNr. → Reverse Charge
- `oss`: vorbereitet für Zielland-MwSt.
- `home_b2c_only`: Privatkunden nur Heimatland-Adresse
