# Vercel previews

1. Import the Thamba repository into Vercel and select the Next.js preset with the repository root as the Root Directory.
2. Select Node.js 24.x. Set the Preview environment variable `ENABLE_EXPERIMENTAL_COREPACK` to `1` so Vercel uses the pnpm version pinned in `package.json`. Set the Install Command to `pnpm install --frozen-lockfile` and the Build Command to `pnpm build`. The repository sets the function region to Mumbai (`bom1`).
3. Open a pull request to generate a Preview deployment. Open its URL and confirm that `/` redirects to `/mr` and renders **थांबा**. Check `/en` and `/hi` for the corresponding document languages.

The application builds without credentials. When Supabase wiring lands, use an isolated Mumbai (`ap-south-1`) project with synthetic data. Add the preview project's `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` under **Settings → Environment Variables → Preview**. Store database URLs, dispatch tokens and private push credentials in Preview-scoped server environment variables. Keep credentials in the hosting dashboard and use a separate Supabase project for production.

[Vercel build configuration](https://vercel.com/docs/builds/configure-a-build#corepack) · [Vercel deployment environments](https://vercel.com/docs/deployments/environments) · [Vercel regions](https://vercel.com/docs/regions) · [Thamba architecture](../02-plan/architecture.md)
