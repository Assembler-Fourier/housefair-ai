# Stripe Setup For HouseFair

Use Stripe test mode first.

Do not commit secret keys. Do not hardcode live keys.

## 1. Create Product

In Stripe Dashboard:

- Product name: `HouseFair`
- Description: `Fair chores, groceries, issues, and shared money for roommates.`

## 2. Create Prices

Monthly:

- Recurring
- EUR
- `€4.99`
- Monthly

Annual:

- Recurring
- EUR
- `€49.99`
- Yearly

Copy the price IDs into Vercel:

```bash
STRIPE_PRICE_MONTHLY_EUR=price_...
STRIPE_PRICE_YEARLY_EUR=price_...
```

## 3. Add API Keys

Use test keys first:

```bash
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
```

Only switch to live keys after a full test checkout and webhook verification.

## 4. Add Webhook

Endpoint:

```txt
https://YOUR_DOMAIN.com/api/stripe/webhook
```

Events:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`
- `customer.deleted`

Copy the signing secret:

```bash
STRIPE_WEBHOOK_SECRET=whsec_...
```

## 5. Customer Portal

Enable Stripe Customer Portal in the Stripe Dashboard.

Allow customers to:

- Update payment method
- Update billing details
- View invoices
- Cancel subscription if desired

The app opens the portal through:

```txt
POST /api/billing/create-portal-session
```

## 6. Tax

If Stripe Tax is configured, set:

```bash
STRIPE_TAX_ENABLED=true
```

This enables `automatic_tax` in Checkout and requires billing address collection.

Do not claim tax compliance until Stripe Tax and legal review are complete.

## 7. Test Checklist

- Create account with Supabase Auth
- Create household
- Start monthly checkout
- Complete test card payment
- Confirm webhook inserts/updates `subscriptions`
- Confirm `/app/today` unlocks
- Open Customer Portal
- Cancel subscription in test mode
- Confirm webhook updates status
- Test yearly checkout
- Test failed payment webhook
