<!--
SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project

SPDX-License-Identifier: Apache-2.0
-->

![CitrineOS Logo](public/logo_white.png#gh-dark-mode-only)
![CitrineOS Logo](public/logo_black.png#gh-light-mode-only)

<div align="center">
  <img
    src="public/OCPP_201_Logo_core_and_advanced_security.png"
    alt="CitrineOS Certification Logo"
    width="200"
    height="100"
  />
</div>

# Welcome to CitrineOS Operator UI

**CitrineOS Operator UI** is the web-based operator interface for **CitrineOS**, an open-source, modular backend
platform for managing Electric Vehicle (EV) charging infrastructure.

This repository contains the **Operator-facing User Interface** and related tooling. It extends the original [citrineos-operator-ui](https://github.com/citrineos/citrineos-operator-ui) with a BetterAuth and OpenStreetMap integration and other enhancements.
It is designed to work together with **CitrineOS Core**, which provides the charging station management logic,
OCPP message handling, persistence layer, and GraphQL APIs.

> ⚠️ **Important:**  
> The Operator UI **does not run standalone**.  
> A running instance of **CitrineOS Core** (including Hasura GraphQL Engine) is required.

---

## Table of Contents

- [Welcome to CitrineOS Operator UI](#welcome-to-citrineos-operator-ui)
  - [Table of Contents](#table-of-contents)
  - [Overview](#overview)
  - [Architecture \& Data Flow](#architecture--data-flow)
  - [Prerequisites](#prerequisites)
  - [Getting Started](#getting-started)
    - [Running with Docker (Recommended)](#running-with-docker-recommended)
    - [Running with pnpm (Local Development)](#running-with-pnpm-local-development)
    - [Database Migrations](#database-migrations)
    - [Creating an Admin User](#creating-an-admin-user)
    - [Working with a Local `citrineos-core`](#working-with-a-local-citrineos-core)
    - [Step-by-step](#step-by-step)
  - [Build \& Development Workflow](#build--development-workflow)
    - [Typical Workflow](#typical-workflow)
  - [Running the Application](#running-the-application)
    - [Development Mode](#development-mode)
    - [Production Build](#production-build)
  - [Bringing a Charging Station Online (End-to-End)](#bringing-a-charging-station-online-end-to-end)
    - [Create a Location](#create-a-location)
    - [Add a Charging Station (Charge Point)](#add-a-charging-station-charge-point)
    - [Add an EVSE (Electric Vehicle Supply Equipment)](#add-an-evse-electric-vehicle-supply-equipment)
    - [Add a Connector](#add-a-connector)
    - [Add an Authorization (ID Token)](#add-an-authorization-id-token)
    - [Start the Charging Station (EVerest)](#start-the-charging-station-everest)
  - [Usage](#usage)
  - [Configuration](#configuration)
  - [Authentication, Roles \& Multi-Tenancy](#authentication-roles--multi-tenancy)
  - [Tools \& Libraries](#tools--libraries)
    - [External services (need to be provided)](#external-services-need-to-be-provided)
    - [Libraries](#libraries)
  - [Hasura Authentication](#hasura-authentication)
  - [Related Documentation](#related-documentation)
  - [Contributing](#contributing)
  - [Licensing](#licensing)
  - [Support and Contact](#support-and-contact)

---

## Overview

The CitrineOS Operator UI provides operators with:

- Visibility into charging stations, connectors, sessions, and transactions
- Operational controls via CitrineOS Core Message APIs
- Data access through **Hasura GraphQL Engine**
- A modern React-based UI built with **Refine**, **Next.js** and **shadcn/ui**, responsive down to mobile devices
- Authentication with **Better Auth** and/or **Keycloak**
- Multi-tenancy: **organizations** mapped to CitrineOS tenants
- Role-based access (app roles and organization roles);
- Maps based on free **OpenStreetMap** tiles (no API key)
- CSV/JSON export of transactions and other lists

The UI consumes:
- **Hasura GraphQL APIs** for data access
- **CitrineOS Core Message APIs** for sending commands to charging stations
- **CitrineOS Core Data APIs** for managing entities

---

## Architecture & Data Flow

```text
+-------------------+       GraphQL       +----------------------+
|                   |  <----------------> |                      |
|  Operator UI      |                     |  Hasura GraphQL      |
|                   |                     |  Engine              |
|                   |                     |                      |
+-------------------+                     +----------+-----------+
                                                       |
                                                       | SQL
                                                       |
                                             +---------v-----------+
                                             |                     |
                                             |  PostgreSQL         |
                                             |                     |
                                             +---------------------+

+-------------------+       REST       +--------------------------+
| Operator UI       | <--------------> | CitrineOS Core           |
|                   |                  | (OCPP 1.6 & 2.0.1)       |
+-------------------+                  +--------------------------+
        |
        | SQL (Drizzle ORM)         +-----------------------------+
        +-------------------------> | Auth PostgreSQL (auth-db)   |
                                    | users, orgs, passkeys, ...  |
                                    +-----------------------------+
```

The UI keeps its own **auth database** (separate from the CitrineOS database) for users, sessions,
organizations, memberships and passkeys. Its schema is managed by Drizzle migrations in [`drizzle/`](drizzle).

## Prerequisites

Before starting, ensure the following tools and services are installed and running.
- **Node.js** (v24 or higher recommended)  
  [Link](https://nodejs.org)

- **pnpm**  
  Enabled via `corepack enable` (version pinned in `packageManager`)

- **Docker & Docker Compose** (recommended)  
  [Link](https://www.docker.com/products/docker-desktop/)

The following services must be available before starting the application:

- **CitrineOS Core**  
  Backend service responsible for OCPP 1.6 and OCPP 2.0.1 handling, charging station management, and APIs.

- **Hasura GraphQL Engine**  
  GraphQL layer used for data access and management.

References:

- **CitrineOS Core Repository**  
  [Documentation](https://github.com/citrineos/citrineos-core)

- **Hasura Documentation**  
  [Documentation](https://hasura.io/docs/2.0/)


## Getting Started

### Running with Docker (Recommended)

If **CitrineOS Core** is already running via Docker, the Operator UI can be started with a single command:

```bash
cp .env.example .env.local   # then set BETTER_AUTH_SECRET etc.
docker compose up -d
```

This will:
- Start the `auth-db` PostgreSQL container
- Run the `auth-db-migrate` service, which applies the database migrations and exits
- Build and start the Operator UI once the migrations have completed successfully

Then [create an admin user](#creating-an-admin-user).

### Running with pnpm (Local Development)

```bash
pnpm install
cp .env.example .env.local        # set AUTH_DATABASE_URL, BETTER_AUTH_SECRET, Hasura/Core URLs
docker compose up -d auth-db      # published on 127.0.0.1:5433; or use any PostgreSQL 16 database
export AUTH_DATABASE_URL=postgresql://citrine:citrine@localhost:5433/citrine_auth   # also set in .env.local
pnpm db:migrate                   # apply migrations
pnpm db:create-admin --email you@example.com --password 'a-strong-password'
pnpm run dev
```
This starts the development server with hot reload.

### Database Migrations

The app does **not** migrate the database at startup.

| Scenario | Command |
| --- | --- |
| Docker Compose | Automatic: the `auth-db-migrate` service runs `drizzle-kit migrate` before the UI starts |
| Local development / manual | `pnpm db:migrate` (uses `AUTH_DATABASE_URL`, default `postgresql://citrine:citrine@localhost:5432/citrine_auth`) |
| After changing `src/lib/db/schema.ts` | `pnpm db:generate`, review the new SQL in `drizzle/`, then `pnpm db:migrate` |

To re-run only the migrations in Docker: `docker compose run --rm auth-db-migrate`.

### Creating an Admin User

Public sign-up is disabled and there is no seeded account, so create the first administrator after migrating:

```bash
pnpm db:create-admin --email admin@example.com --password 'a-strong-password' \
  [--name "Administrator"] [--tenant-id 1] [--no-org]
```

This creates (or promotes and resets the password of) a `superadmin` user with a verified email, plus a
`Default` organization mapped to the given CitrineOS tenant id (default `NEXT_PUBLIC_TENANT_ID` or `1`) with the
user as organization admin. Pass `--no-org` to skip the organization. `ADMIN_EMAIL`, `ADMIN_PASSWORD` and
`ADMIN_NAME` environment variables work in place of flags. The script is idempotent.

With Docker Compose, run it from the host against the published auth-db port (`AUTH_DATABASE_URL=postgresql://citrine:citrine@localhost:5433/citrine_auth pnpm db:create-admin ...`),
or inside the migrator image: `docker compose run --rm auth-db-migrate node scripts/create-admin.mjs --email ... --password ...`.
Further users can then be invited from **Admin** and **Organization** pages.

### Working with a Local `citrineos-core`

When developing Operator UI against a **local build of citrineos-core** (for example, a release candidate or feature branch),
you can link the core package using `pnpm link`.

### Step-by-step
1. Build CitrineOS Core first:

```bash
cd citrineos-core
pnpm run build
```

2. Link the base package:

```bash
cd 00_Base
pnpm link
```
3. Link it inside Operator UI:

```bash
cd citrineos-operator-ui
pnpm link @citrineos/base@X.X.X
```

> ⚠️ **Note:**
> Running `pnpm run fresh` or `pnpm run fi` will remove this link and you will need to re-link. 

## Build & Development Workflow
The Operator UI uses **pnpm** for local development convenience.

### Typical Workflow

1. Build CitrineOS Core: 

```bash
cd citrineos-core
pnpm run build
```

2. Install Operator UI dependencies:

```bash
cd citrineos-operator-ui
pnpm install
```

3. Start development server:

```bash
pnpm run dev
```

## Running the Application

### Development Mode

```bash
pnpm run dev
```

- Runs the app with hot reload
- Default URL: http://localhost:3000

### Production Build

```bash
pnpm run build
pnpm run start
```

- Production preview URL: http://localhost:3000

## Bringing a Charging Station Online (End-to-End)

This section describes the **minimum operational steps** required to bring a charging station online using:

- **CitrineOS Operator UI**
- **CitrineOS Core**
- **EVerest simulator**

These steps are required even for local development and testing.

---

### Create a Location

In CitrineOS, **all charging stations must belong to a Location**.

1. Open **CitrineOS Operator UI**:
2. Navigate to:

```pgsql
Locations → Create Location
```

3. Fill in the required metadata (name, address, country, etc.)
4. Save the Location 

> A Location represents a physical site such as a parking garage, depot, or charging hub.

---

### Add a Charging Station (Charge Point)

To add a new charging station in CitrineOS Operator UI:

1. Navigate to: 

```sql
Charging Stations → Add Charging Station
```

2. Select the previously created **Location**.

3. Use the default **Charge Point ID**:  

```nginx 
cp001
```  

>⚠️ **Important:** 
The Charge Point ID must exactly match the ID used by your physical charging station or simulator.
By default, **EVerest** uses `cp001`.

4. Click **Save** to create the charging station.

---

### Add an EVSE (Electric Vehicle Supply Equipment)

Each Charging Station must contain at least one EVSE.

1. Open the Charging Station you just created.
2. Navigate to:  

```sql 
EVSEs → Add EVSE
```

3. Use a numeric **EVSE ID** (example: `1`).
4. Click **Save**.  

> EVSEs represent physical charge points within a station (e.g., left/right ports).

---

### Add a Connector

Each EVSE must have at least one Connector.

1. Open the EVSE.
2. Navigate to: 

```sql
Connectors → Add Connector
```

3. Choose:  
   - **Connector ID** (example: `1`)  
   - **Connector type** (Type2, CCS, etc.)
4. Click **Save**.  

> Without a Connector, charging sessions cannot be started.

---

### Add an Authorization (ID Token)

To allow charging sessions, an ID Token must be authorized.

1. Navigate to:  

```sql
Authorizations → Add Authorization
```

2. Create an **ID Token** (RFID, app token, etc.)
3. Mark it as **Accepted**
4. Click **Save**  

> ⚠️ Note: This token will be used by EVerest to start charging.
> The EVerest simulator uses the **default RFID token** `DEADBEEF` **(ISO14443)**.

---

### Start the Charging Station (EVerest)

Now that the backend configuration is complete, start the EVerest simulator:

```bash
cd citrineos-core/Server
pnpm run start-everest
```

This will:
**In Operator UI**
- Navigate to **Charging Stations**
- Status should show:

```nginx
Online
```

You can now track OCPP logs for the charging station.

## Usage

Once running, the Operator UI allows you to:
- View and manage charging stations and connectors
- Monitor transactions and sessions
- Trigger charging station commands (via CitrineOS Core)
- Query and manage data through Hasura-backed GraphQL APIs

## Configuration

Copy [.env.example](.env.example) to `.env.local`. Highlights:

- **Authentication** – [better-auth](https://www.better-auth.com) with the *admin*, *organization* and *passkey* plugins. Users, sessions, organizations and passkeys live in PostgreSQL (`AUTH_DATABASE_URL`; tables are created by the `auth-db-migrate` service in `docker compose up` (or run `pnpm db:migrate` manually) and compose provides a ready-made `auth-db` service). Set `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL` (the latter is also the passkey origin). Each organization maps to a CitrineOS tenant through its `tenantId` metadata. Admins manage users and organizations under **Admin**; everyone manages passkeys under **Account**. After signing in on a device without a registered passkey, users are offered to register one. New organizations get the next free tenant id (largest CitrineOS `Tenants` id + 1).
- **Email** – [nodemailer](https://nodemailer.com) sends invitation and password-reset emails. Set `SMTP_HOST` (plus `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`); without `SMTP_HOST` emails are only logged to the server console.
- **Branding** – set `NEXT_PUBLIC_LOGO_URL` (optionally `NEXT_PUBLIC_LOGO_DARK_URL`, `NEXT_PUBLIC_LOGO_ICON_URL`, `NEXT_PUBLIC_FAVICON_URL`, `NEXT_PUBLIC_APP_NAME`). These are build-time variables.
- **Maps** – OpenStreetMap tiles through Leaflet and Nominatim for address search; no API keys. Override with `NEXT_PUBLIC_MAP_TILE_URL*` and `NOMINATIM_URL` (self-host for heavy use).
- **Multiple connectors** – every connector of a charger can be started and stopped independently from the station's EVSE/connector list; the station-level Start button stays available while other connectors are charging.

## Authentication, Roles & Multi-Tenancy

Better Auth (admin, organization and passkey plugins) is the default provider, backed by PostgreSQL through Drizzle ORM (`src/lib/db`). SQL migrations in `drizzle/` are applied by the compose `auth-db-migrate` service or `pnpm db:migrate` (see [Database Migrations](#database-migrations)); regenerate after schema changes with `pnpm db:generate`.

- **Application roles:** `superadmin`, `admin` (manage all users and organizations), `auditor` (read-only everywhere), `user`. The first `superadmin` is created with `pnpm db:create-admin`.
- **Organization roles:** `admin` (manage members, invitations and data), `operator` (read/write, no delete), `auditor` (read-only). An organization's `tenantId` metadata maps to the CitrineOS tenant used for Hasura requests.
- **Pages:** `/account` (profile, security/passkeys/sessions, preferences incl. theme), `/organization` (members, invites, password resets), `/admin` (all users and organizations).
- **Invitations / password resets:** sent via SMTP when `SMTP_HOST` is set; otherwise the links are logged on the server console.
- **Organization settings** are visible only to application admins and organization admins/owners.
- **Export:** transactions, charging stations, authorizations and tariffs lists have CSV/JSON export honoring the active filters.
- Read-only enforcement is applied in the UI via Refine access control; restrict Hasura permissions for stronger server-side guarantees.

## Tools & Libraries

### External services (need to be provided)

| Service | Purpose | Resources |
| --- | --- | --- |
| CitrineOS Core | OCPP backend and REST APIs | [citrineos-core](https://github.com/citrineos/citrineos-core) |
| Hasura GraphQL Engine | Data API (ships with Core) | [Docs](https://hasura.io/docs/2.0/) |
| PostgreSQL 16 | Auth database (`auth-db` in compose) | [postgresql.org](https://www.postgresql.org/docs/16/) |
| SMTP server (optional) | Invitation / reset emails | e.g. [Mailpit](https://mailpit.axllent.org/) for dev, or any SMTP provider |
| Keycloak (optional) | Alternative auth provider | [keycloak.org](https://www.keycloak.org/documentation) |
| AWS S3 / Google Cloud Storage (optional) | File storage | [S3](https://docs.aws.amazon.com/s3/), [GCS](https://cloud.google.com/storage/docs) |
| OpenStreetMap tiles | Map tiles | [Tile usage policy](https://operations.osmfoundation.org/policies/tiles/) |
| Nominatim | Address search | [Usage policy](https://operations.osmfoundation.org/policies/nominatim/); self-host for heavy use |

### Libraries

| Area | Libraries |
| --- | --- |
| Framework | [Next.js](https://nextjs.org), [React](https://react.dev), [TypeScript](https://www.typescriptlang.org) |
| Admin framework | [Refine](https://refine.dev) (`core`, `hasura`, `nextjs-router`, `react-hook-form`, `react-table`, `kbar`), [@ferdiunal/refine-shadcn](https://github.com/ferdiunal/refine-ui) |
| Auth | [better-auth](https://www.better-auth.com) with [passkey](https://www.better-auth.com/docs/plugins/passkey), [organization](https://www.better-auth.com/docs/plugins/organization) and [admin](https://www.better-auth.com/docs/plugins/admin) plugins |
| Database | [Drizzle ORM](https://orm.drizzle.team) and drizzle-kit, [node-postgres](https://node-postgres.com) |
| Email | [nodemailer](https://nodemailer.com) |
| UI | [shadcn/ui](https://ui.shadcn.com), [Radix UI](https://www.radix-ui.com), [Tailwind CSS 4](https://tailwindcss.com), [lucide-react](https://lucide.dev), [sonner](https://sonner.emilkowal.ski), [next-themes](https://github.com/pacocoursey/next-themes), [framer-motion](https://www.framer.com/motion/), [recharts](https://recharts.org), [react-day-picker](https://daypicker.dev), [Sass](https://sass-lang.com) |
| Tables, forms, state | [TanStack Table](https://tanstack.com/table), [TanStack Query](https://tanstack.com/query), [React Hook Form](https://react-hook-form.com), [Zod](https://zod.dev), [Redux Toolkit](https://redux-toolkit.js.org), [redux-persist](https://github.com/rt2zz/redux-persist), [nuqs](https://nuqs.dev), [next-intl](https://next-intl.dev), [date-fns](https://date-fns.org) |
| Maps | [Leaflet](https://leafletjs.com), [react-leaflet](https://react-leaflet.js.org), [react-leaflet-cluster](https://github.com/akursat/react-leaflet-cluster) |
| CitrineOS integration | [@citrineos/base](https://github.com/citrineos/citrineos-core), [graphql-request](https://github.com/graffle-js/graffle), [axios](https://axios-http.com), class-transformer, class-validator |
| Storage & telemetry | [AWS SDK for S3](https://github.com/aws/aws-sdk-js-v3), [@google-cloud/storage](https://github.com/googleapis/nodejs-storage), [OpenTelemetry](https://opentelemetry.io) |
| Tooling | [pnpm](https://pnpm.io), [ESLint](https://eslint.org), [Prettier](https://prettier.io), [Docker Compose](https://docs.docker.com/compose/) |

> Note: `zod` must stay at the version required by `@citrineos/base`; do not add a global `zod` override in `pnpm.overrides`.

## Hasura Authentication
There are two ways to authenticate to Hasura:

1. If you have **uncommented* the Docker environment variable `HASURA_GRAPHQL_ADMIN_SECRET` in `citrineos-core`: 2. Ensure your `.env.local` has the `HASURA_ADMIN_SECRET` uncommented out 3. Please note that it is not recommended to use a Hasura Admin Secret in production.
2. If you have commented the Docker environment variable `HASURA_GRAPHQL_ADMIN_SECRET` in `citrineos-core`: 5. Ensure your `.env.local` has the `HASURA_ADMIN_SECRET` commented out, as the auth will be handled by your auth provider automatically.

## Related Documentation

- **CitrineOS Core**
  - [Docs](https://github.com/citrineos/citrineos-core)
- **CitrineOS Project Docs**
  - [Docs](https://citrineos.github.io)
- **Refine**
  - [Docs](https://refine.dev/docs)
- **Hasura GraphQL Engine**
  - [Docs](https://hasura.io/docs/2.0/index/)
- **Postgres Data Connector**
  - [Docs](https://hasura.io/docs/2.0/databases/postgres/index/)

## Contributing
We welcome contributions from the community. If you would like to contribute to CitrineOS, please follow
our [contribution guidelines](https://github.com/citrineos/citrineos/blob/main/CONTRIBUTING.md).

## Licensing
CitrineOS and its subprojects are licensed under the Apache License, Version 2.0.

## Support and Contact
If you need help or want to report an issue:
- Open an issue on GitHub
- Reach out via the CitrineOS community channels