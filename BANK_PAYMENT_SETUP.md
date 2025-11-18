# Stripe ACH Bank Payment Setup Guide

## 🎯 What This Does

Your form now charges **bank accounts directly** through Stripe ACH (US Bank Payments). Users enter their bank details and the payment is processed automatically.

---

## 🔑 Step 1: Get Stripe API Keys

1. Go to **https://dashboard.stripe.com/register** (create account or login)
2. You'll see **Test mode** toggle at top right - keep it ON for testing
3. Go to **Developers** → **API keys**
4. Copy two keys:
   - **Publishable key**: `pk_test_xxxxxxxxxxxxx`
   - **Secret key**: `sk_test_xxxxxxxxxxxxx` (click "Reveal test key")

---

## ⚙️ Step 2: Add Keys to Vercel

### Option A: Vercel Dashboard (Easiest)
1. Go to https://vercel.com/dashboard
2. Select your project: **payment-pages**
3. Click **Settings** → **Environment Variables**
4. Add new variable:
   - **Name**: `STRIPE_SECRET_KEY`
   - **Value**: Your secret key (sk_test_xxxxx)
   - **Environment**: All (Production, Preview, Development)
5. Click **Save**
6. **Redeploy** your project

### Option B: Local Development
1. Create file `.env.local` in project root:
```
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
```
2. Run: `vercel env pull` to sync with Vercel

---

## 🧪 Step 3: Test the Payment

### Run Locally:
```bash
npm run dev
```

### Test the Form:
1. Fill out all fields
2. Use **test bank account**:
   - **Routing Number**: `110000000`
   - **Account Number**: `000123456789`
3. Click **Submit Payment**
4. Enter amount: `100` (for $100)
5. You'll see success message!

### Check Stripe Dashboard:
- Go to **Payments** → you'll see the charge
- Go to **Customers** → you'll see the customer created

---

## 🏦 Test Bank Account Numbers

Stripe provides test numbers that simulate different scenarios:

| Routing Number | Account Number | Result |
|----------------|----------------|---------|
| `110000000` | `000123456789` | ✅ Success |
| `110000000` | `000111111113` | ❌ Account closed |
| `110000000` | `000222222227` | ❌ Insufficient funds |

**Card Numbers for Testing**:
- Success: `4242 4242 4242 4242`
- Any future expiry, any CVV

---

## 🚀 Step 4: Go Live

### 1. Enable ACH in Stripe
- Stripe Dashboard → **Settings** → **Payment methods**
- Enable **ACH Direct Debit**

### 2. Complete Business Verification
- Stripe will ask for business details
- Required for real bank payments

### 3. Switch to Live Mode
- Toggle from **Test mode** to **Live mode** (top right)
- Get **Live** API keys from Developers → API keys
- Update `STRIPE_SECRET_KEY` in Vercel to use **live** key (`sk_live_xxxxx`)

### 4. Deploy
```bash
vercel --prod
```

---

## 💰 How Users Pay

1. User fills form with their real bank details
2. Clicks **Submit Payment**
3. Enters payment amount
4. Payment is processed through Stripe ACH
5. Money appears in your Stripe balance in **3-7 business days** (ACH takes time)
6. You can transfer to your bank account

---

## ⚠️ Important Notes

### Security
✅ Bank details are sent directly to Stripe's secure API
✅ Your server never stores raw bank account numbers
✅ All handled via HTTPS

### ACH Payment Timeline
- **Authorization**: Immediate
- **Processing**: 3-7 business days
- **Disputes**: Customers can dispute within 60 days

### Costs
- Stripe ACH fee: **0.8%** capped at **$5** per transaction
- Example: $100 payment = $0.80 fee, you receive $99.20

---

## 🐛 Troubleshooting

### Error: "Missing API key"
- Make sure `STRIPE_SECRET_KEY` is set in Vercel
- Redeploy after adding environment variables

### Error: "Invalid routing number"
- Use test numbers in test mode: `110000000`
- Real numbers only work in live mode

### Error: "Bank account verification failed"
- In test mode, auto-verified
- In live mode, Stripe sends micro-deposits (2 small amounts)
- Customer must verify by entering amounts

### Payment not showing in Dashboard
- Check you're in correct mode (Test vs Live)
- Check **Payments** tab, not **Payouts**

---

## 📞 Need Help?

1. Check Stripe Dashboard → **Logs** for API errors
2. Check browser console (F12) for frontend errors
3. Check Vercel → **Functions** logs for backend errors

**Stripe Docs**: https://stripe.com/docs/ach
**Test Mode**: Always test with test keys first!

---

## 🎉 You're All Set!

Your form now accepts real bank account payments through Stripe ACH. Users enter their bank details, authorize the payment, and funds are transferred directly from their bank account to your Stripe account.
