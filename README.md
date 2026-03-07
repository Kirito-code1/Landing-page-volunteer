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

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Donation Checkout Setup

The project includes a `/donate` page and backend route: `POST /api/donations/checkout`.

Configure provider checkout URL templates in `.env.local`:

```bash
DONATION_CLICK_URL_TEMPLATE=
DONATION_PAYME_URL_TEMPLATE=
DONATION_STRIPE_URL_TEMPLATE=
DONATION_PAYPAL_URL_TEMPLATE=
NEXT_PUBLIC_DONATION_CARD_NUMBER=
NEXT_PUBLIC_DONATION_CARD_HOLDER=
NEXT_PUBLIC_DONATION_CARD_BANK=
NEXT_PUBLIC_DONATION_CARD_TRANSFER_URL_TEMPLATE=
```

Template tokens supported:

- `{amount}`
- `{currency}`
- `{orderId}`
- `{email}`
- `{returnUrl}`
- `{cancelUrl}`
- `{origin}`
- `{provider}`
- `{card}` (for `NEXT_PUBLIC_DONATION_CARD_TRANSFER_URL_TEMPLATE`)

Example template shape:

```text
https://provider.example/checkout?amount={amount}&currency={currency}&order={orderId}&return={returnUrl}&cancel={cancelUrl}
```

Use checkout URL formats provided by your own merchant cabinet for Click/Payme/Stripe/PayPal.
For direct card transfer mode on `/donate`, fill the `NEXT_PUBLIC_DONATION_CARD_*` variables.
