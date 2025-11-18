# Easy Stripe Integration Guide

## ✅ SIMPLEST METHOD - Stripe Payment Links (No Backend Required)

### Step 1: Create a Stripe Account
1. Go to https://dashboard.stripe.com/register
2. Sign up with your email
3. Complete verification

### Step 2: Create a Payment Link
1. Log in to Stripe Dashboard
2. Click **Products** in left menu
3. Click **Add Product**
4. Fill in:
   - **Name**: "Payment Authorization" (or your service name)
   - **Price**: Enter your amount (e.g., $100)
   - **Currency**: USD
5. Click **Save product**
6. Click **Create payment link** button
7. **Copy the payment link** - it looks like: `https://buy.stripe.com/xxxxx`

### Step 3: Add Payment Link to Your Code

Open `src/components/PaymentForm.tsx` and find this line (around line 127):
```typescript
const stripePaymentLink = 'https://buy.stripe.com/YOUR_PAYMENT_LINK_HERE';
```

Replace `YOUR_PAYMENT_LINK_HERE` with your actual payment link from Step 2.

**Example:**
```typescript
const stripePaymentLink = 'https://buy.stripe.com/test_xxxxxxxxxxxxx';
```

### Step 4: Test It
1. Run your project: `npm run dev`
2. Fill out the form
3. Click Submit
4. You'll be redirected to Stripe's secure payment page
5. Use test card: `4242 4242 4242 4242`, any future expiry, any CVV

### Step 5: Go Live
1. In Stripe Dashboard, toggle from **Test mode** to **Live mode** (top right)
2. Create a new Payment Link in Live mode
3. Replace the test link in your code with the live link
4. Deploy: `vercel --prod`

---

## 🔥 BETTER METHOD - Stripe Checkout with Customer Data

If you want to send customer bank details to Stripe, use this method:

### Step 1: Install Stripe
```bash
npm install @stripe/stripe-js
```

### Step 2: Get Stripe Keys
1. Go to https://dashboard.stripe.com/apikeys
2. Copy **Publishable key** (starts with `pk_test_` or `pk_live_`)

### Step 3: Create Backend Endpoint

You need a simple backend. Use **Vercel Serverless Functions**:

Create file: `api/create-checkout.js`
```javascript
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { formData } = req.body;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Bank Account Authorization',
            description: `${formData.firstName} ${formData.lastName} - ${formData.bankName}`,
          },
          unit_amount: 10000, // $100.00 (amount in cents)
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${req.headers.origin}/success`,
      cancel_url: `${req.headers.origin}/cancel`,
      customer_email: formData.email || undefined,
      metadata: {
        customerName: `${formData.firstName} ${formData.lastName}`,
        bankName: formData.bankName,
        accountType: formData.accountType,
      },
    });

    res.status(200).json({ sessionId: session.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
```

### Step 4: Update Frontend

In `src/components/PaymentForm.tsx`, add at top:
```typescript
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe('pk_test_YOUR_PUBLISHABLE_KEY');
```

Replace `handleSubmit`:
```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!formData.authorization) {
    alert('Please authorize the payment.');
    return;
  }

  try {
    // Call your backend
    const response = await fetch('/api/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ formData }),
    });

    const { sessionId } = await response.json();
    
    // Redirect to Stripe Checkout
    const stripe = await stripePromise;
    const { error } = await stripe!.redirectToCheckout({ sessionId });

    if (error) {
      alert(error.message);
    }
  } catch (err) {
    alert('Payment failed. Please try again.');
  }
};
```

### Step 5: Add Environment Variables

Create `.env` file:
```
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
```

In Vercel Dashboard:
1. Go to Project Settings → Environment Variables
2. Add `STRIPE_SECRET_KEY` with your secret key
3. Redeploy

---

## 💰 Receiving Money

### Test Mode
- All transactions are fake
- Use test cards: https://stripe.com/docs/testing

### Live Mode
1. Complete Stripe account verification
2. Toggle to Live mode in Dashboard
3. Update keys in code from `pk_test_` to `pk_live_`
4. Money goes to your Stripe balance
5. Transfer to bank: Dashboard → Payouts

---

## ❓ Which Method to Use?

**Use Payment Links if:**
- You want the SIMPLEST setup (5 minutes)
- You don't need to store customer data
- Same amount every time

**Use Checkout Sessions if:**
- You need customer data in Stripe
- Variable amounts
- More control over payment flow

---

## 🆘 Common Issues

**Issue**: "Network error" when submitting
- **Fix**: Make sure backend endpoint is working

**Issue**: Redirects but no payment page
- **Fix**: Check your payment link is correct

**Issue**: Payment succeeds but no data saved
- **Fix**: Use webhook to listen for payments (see STRIPE_INTEGRATION_GUIDE.md)

---

## 📞 Need Help?

1. Run project: `npm run dev`
2. Open browser console (F12)
3. Check for errors
4. Share error messages for help
