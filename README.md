# Room Management Paroki Mabes (Nuxt + Cloudflare Workers + D1)

Project ini deploy ke **Cloudflare Workers** (Nitro preset `cloudflare`) dan pakai **Cloudflare D1**.

## Prasyarat

- Node.js + npm
- Wrangler (sudah ada di devDependencies)

## Setup D1

1) Buat DB (sekali saja):

```bash
npx wrangler d1 create paroki-mabes-db
```

2) Pastikan `wrangler.toml` sudah terisi `database_id` untuk `paroki-mabes-db`.

3) Apply migrations:

```bash
npm run migrate:local
```
## Jalankan Project
4) Buat Jalankan Project hidupin wrangler biar jadinya pake env cloudflare buat hit api
npx wrangler dev --local --port=3000

## Setup JWT Secret

**Wajib** set secret di Cloudflare/Wrangler (jangan pakai `CHANGE_ME`).

Untuk local dev (wrangler secret tersimpan lokal):

```bash
npx wrangler secret put JWT_SECRET
```

Lalu isi nilainya (mis. string random panjang).

## Development (Cloudflare runtime)

Menjalankan app via wrangler (supaya binding D1 `DB` tersedia):

```bash
npm run dev:cf
```

## API Auth (phone number + password)

- **POST** `/api/auth/register`
  - body: `{ "phoneNumber": "+62812...", "password": "minimal8char" }`
- **POST** `/api/auth/login`
  - body: `{ "phoneNumber": "+62812...", "password": "minimal8char" }`
  - response: `{ "token": "..." }`
- **GET** `/api/auth/me`
  - header: `Authorization: Bearer <token>`
- **GET** `/api/rooms` (contoh endpoint protected)
  - header: `Authorization: Bearer <token>`

## Setup

Make sure to install dependencies:

```bash
# npm
npm install

# pnpm
pnpm install

# yarn
yarn install

# bun
bun install
```

## Development Server

Start the development server on `http://localhost:3000`:

```bash
# npm
npm run dev

# pnpm
pnpm dev

# yarn
yarn dev

# bun
bun run dev
```

## Production

Build the application for production:

```bash
# npm
npm run build

# pnpm
pnpm build

# yarn
yarn build

# bun
bun run build
```

Locally preview production build:

```bash
# npm
npm run preview

# pnpm
pnpm preview

# yarn
yarn preview

# bun
bun run preview
```

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.
# booking-ruangan-spp
