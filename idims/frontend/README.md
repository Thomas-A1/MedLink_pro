This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel (this monorepo)

This frontend lives at `idims/frontend` inside the `MedLink_pro` repo. When you import the
project on Vercel, set the **Root Directory** to `idims/frontend` so it builds only the
Next.js app (and not the rest of the repo).

1. Push the repo to GitHub (already on `Thomas-A1/MedLink_pro`).
2. Go to https://vercel.com/new and import the repo.
3. In the import screen:
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: `idims/frontend`
   - **Build Command**: `next build` (default)
   - **Output Directory**: `.next` (default)
   - **Install Command**: `npm install` (default)
4. Add **Environment Variables** (see `.env.example`):
   - `NEXT_PUBLIC_API_URL` — public IDIMS REST API base URL
   - `NEXT_PUBLIC_WS_URL` — public IDIMS WebSocket URL
5. Click **Deploy**. Subsequent pushes to the default branch will auto-deploy.

> The backend (`idims/backend`) is not deployed here; expose it on a public URL and put
> that URL in `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_WS_URL`. CORS on the backend must
> allow the Vercel domain.

