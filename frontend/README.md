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

## Environment Variables

This project uses environment variables for configuration. To set up:

1. Copy `.env.development` to `.env`
2. Edit `.env` with your specific configuration values
3. For production deployment, use `.env.production` with appropriate values

Key environment variables:
- `FLASK_ENV`: Set to 'development' or 'production'
- `SECRET_KEY`: A secure random key for session encryption
- `DATABASE_URL`: Database connection string
- `SESSION_COOKIE_SECURE`: Set to 'True' in production
- `CORS_ALLOWED_ORIGINS`: Comma-separated list of allowed origins
