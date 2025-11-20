// server.js
require('dotenv').config();
const express = require("express");
const path = require("path");
const fs = require("fs");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const proposals = require("./proposals");

const app = express();

// Debug middleware first - log all requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// JSON parser for API routes (must come before routes)
app.use(express.json());

// URL encoded parser
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static('public'));

const BASE_URL = process.env.BASE_URL || "http://localhost:4242";

// === TEST ROUTE ===
app.get('/test', (req, res) => {
  res.json({ message: 'Server is working!' });
});

app.post('/test-post', (req, res) => {
  console.log('Test POST received:', req.body);
  res.json({ message: 'POST is working!', body: req.body });
});

// === 1. Функція, яка додає комісію Stripe до суми (клієнт оплачує fee) ===
function addStripeFee(netAmountCents) {
  const pct = 0.029; // 2.9 %
  const fixed = 30; // 0.30$ в центах
  return Math.ceil((netAmountCents + fixed) / (1 - pct));
}

// === 2. Для зручності: показати всі доступні лінки в консолі ===
console.log("✅ Server starting...");
console.log("Доступні пропозиції:");
proposals.forEach((p) => {
  console.log(`- ${p.clientName}: ${BASE_URL}/p/${p.id}`);
});

// === 3. Proposal details page: /p/:id ===
app.get("/p/:id", (req, res) => {
  const id = req.params.id;
  const prop = proposals.find((p) => p.id === id);

  if (!prop) {
    return res.status(404).send("Пропозиція не знайдена");
  }

  const gross = addStripeFee(prop.amountNet);
  const priceText =
    (gross / 100).toFixed(2) + " " + prop.currency.toUpperCase();

  const status = req.query.status;

  // Текстова підказка клієнту
  let billingNote = "Це одноразовий платіж.";
  if (prop.recurring && prop.interval === "month") {
    if (prop.cancellationMonths === 1) {
      billingNote =
        "Перший платіж буде через " +
        (prop.trialDays || 0) +
        " днів, НЕ буде автоматично продовжуватись після першого місяця.";
    } else {
      billingNote =
        "Щомісячна підписка з автоматичним продовженням до скасування.";
    }
  }

  // Load proposal details HTML template
  let html = fs.readFileSync(path.join(__dirname, 'proposal-details.html'), 'utf8');

  // Replace placeholders
  html = html.replace(/{{TITLE}}/g, prop.title);
  html = html.replace(/{{CLIENT_NAME_HEADER}}/g, "Пропозиція для " + prop.clientName);
  html = html.replace(/{{PROPOSAL_TITLE}}/g, prop.title);
  html = html.replace(/{{PROPOSAL_DESCRIPTION}}/g, prop.description);
  html = html.replace(/{{AMOUNT}}/g, priceText);
  html = html.replace(/{{BILLING_NOTE}}/g, billingNote);
  html = html.replace(/{{PROPOSAL_ID}}/g, prop.id);

  if (status === "success") {
    html = html.replace('</body>', '<div style="position:fixed;top:20px;right:20px;background:green;color:white;padding:12px;border-radius:8px;z-index:9999">✅ Payment Successful!</div></body>');
  } else if (status === "cancel") {
    html = html.replace('</body>', '<div style="position:fixed;top:20px;right:20px;background:orange;color:white;padding:12px;border-radius:8px;z-index:9999">❌ Payment Cancelled</div></body>');
  }

  res.send(html);
});

// === 3b. Payment form page: /pay/:id ===
app.get("/pay/:id", (req, res) => {
  const id = req.params.id;
  const prop = proposals.find((p) => p.id === id);

  if (!prop) {
    return res.status(404).send("Пропозиція не знайдена");
  }

  const gross = addStripeFee(prop.amountNet);
  const priceText =
    (gross / 100).toFixed(2) + " " + prop.currency.toUpperCase();

  // Текстова підказка клієнту
  let billingNote = "This is a one-time payment.";
  if (prop.recurring && prop.interval === "month") {
    if (prop.cancellationMonths === 1) {
      billingNote =
        "First payment will be in " +
        (prop.trialDays || 0) +
        " days, will NOT auto-renew after first month.";
    } else {
      billingNote =
        "Monthly subscription with automatic renewals until cancelled.";
    }
  }

  // Load payment form HTML template
  let html = fs.readFileSync(path.join(__dirname, 'payment-form.html'), 'utf8');

  // Replace placeholders
  html = html.replace(/{{TITLE}}/g, prop.title);
  html = html.replace(/{{CLIENT_NAME}}/g, prop.clientName);
  html = html.replace(/{{PROPOSAL_TITLE}}/g, prop.title);
  html = html.replace(/{{PROPOSAL_DESCRIPTION}}/g, prop.description);
  html = html.replace(/{{AMOUNT}}/g, priceText);
  html = html.replace(/{{BILLING_NOTE}}/g, billingNote);
  html = html.replace(/{{PROPOSAL_ID}}/g, prop.id);
  html = html.replace(/{{BACKGROUND_IMAGE}}/g, '/background-3.jpeg');
  html = html.replace(/{{STRIPE_PUBLISHABLE_KEY}}/g, process.env.STRIPE_PUBLISHABLE_KEY);

  res.send(html);
});

// === 4. API: Create Payment Intent for direct ACH payment ===
app.post("/api/create-payment-intent", async (req, res) => {
  console.log('📥 Payment Intent Request received');
  console.log('Request body:', req.body);
  
  const { proposalId } = req.body;
  
  if (!proposalId) {
    console.error('Missing proposalId:', proposalId);
    return res.status(400).json({ success: false, error: "Missing proposal ID" });
  }
  
  const prop = proposals.find((p) => p.id === proposalId);

  if (!prop) {
    return res.status(404).json({ success: false, error: "Proposal not found" });
  }

  try {
    console.log('Creating Payment Intent for proposal:', proposalId);

    const gross = addStripeFee(prop.amountNet);
    const isSubscription = !!prop.recurring;

    if (isSubscription) {
      return res.status(400).json({ 
        success: false, 
        error: 'Subscriptions require Stripe Checkout. Please use one-time payments for direct ACH.' 
      });
    }

    // Create Payment Intent for one-time ACH payment
    // Customer and payment method will be created by Stripe Elements
    const paymentIntent = await stripe.paymentIntents.create({
      amount: gross,
      currency: prop.currency,
      payment_method_types: ['us_bank_account'],
      payment_method_options: {
        us_bank_account: {
          financial_connections: {
            permissions: ['payment_method', 'balances'],
          },
        },
      },
      metadata: {
        proposal_id: prop.id,
        client_name: prop.clientName,
      },
    });

    console.log('✅ Payment Intent created:', paymentIntent.id);

    res.json({ 
      success: true, 
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });

  } catch (err) {
    console.error("Error creating Payment Intent:", err);
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
});

// === 5. OLD API: Create customer and redirect to Checkout (kept for backward compatibility) ===
app.post("/api/create-customer", async (req, res) => {
  const { formData, proposalId } = req.body;
  const prop = proposals.find((p) => p.id === proposalId);

  if (!prop) {
    return res.status(404).json({ success: false, error: "Proposal not found" });
  }

  try {
    console.log('Creating customer for proposal:', proposalId);
    console.log('BASE_URL:', BASE_URL);
    console.log('Stripe API Key exists:', !!process.env.STRIPE_SECRET_KEY);
    console.log('Stripe API Key prefix:', process.env.STRIPE_SECRET_KEY?.substring(0, 10));
    
    // Create Stripe Customer with all bank authorization data in metadata
    const customer = await stripe.customers.create({
      name: `${formData.firstName || ''} ${formData.lastName || ''}`.trim(),
      email: formData.email || undefined,
      address: {
        line1: formData.addressLine1 || '',
        line2: formData.addressLine2 || undefined,
        city: formData.city || '',
        state: formData.state || '',
        postal_code: formData.zipCode || '',
        country: 'US',
      },
      metadata: {
        proposalId: proposalId,
        companyName: formData.companyName || '',
        bankName: formData.bankName || '',
        accountType: formData.accountType || '',
        accountHolder: `${formData.accountFirstName || ''} ${formData.accountLastName || ''}`.trim(),
        routingNumber: formData.routingNumber || '',
        accountNumberLast4: formData.accountNumber ? formData.accountNumber.slice(-4) : '',
      },
    });

    console.log('✅ Customer created:', customer.id);

    // Now create checkout session - Stripe Checkout will collect bank account
    const gross = addStripeFee(prop.amountNet);
    const isSubscription = !!prop.recurring;
    
    const successUrl = `${BASE_URL}/p/${prop.id}?status=success`;
    const cancelUrl = `${BASE_URL}/p/${prop.id}?status=cancel`;
    
    console.log('Success URL:', successUrl);
    console.log('Cancel URL:', cancelUrl);

    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      mode: isSubscription ? "subscription" : "payment",
      payment_method_types: ['us_bank_account'],
      line_items: [
        {
          price_data: {
            currency: prop.currency,
            product_data: { name: prop.title },
            unit_amount: gross,
            ...(isSubscription
              ? { recurring: { interval: prop.interval || "month" } }
              : {}),
          },
          quantity: 1,
        },
      ],
      payment_method_options: {
        us_bank_account: {
          verification_method: 'automatic',
        },
      },
      ...(isSubscription
        ? {
            subscription_data: {
              trial_period_days: prop.trialDays || 0,
              metadata: {
                proposal_id: prop.id,
                client_name: prop.clientName,
                one_month_only:
                  prop.interval === "month" &&
                  prop.cancellationMonths === 1
                    ? "true"
                    : "false",
              },
            },
          }
        : {}),
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        proposal_id: prop.id,
        client_name: prop.clientName,
        customer_id: customer.id,
      },
    });

    console.log('✅ Checkout session created:', session.id);
    console.log('Checkout URL:', session.url);

    if (!session.url) {
      throw new Error('Stripe did not return a checkout URL');
    }

    res.json({ success: true, checkoutUrl: session.url, customerId: customer.id });
  } catch (err) {
    console.error("Error creating customer/checkout:", err);
    console.error("Full error details:", JSON.stringify(err, null, 2));
    res.status(500).json({ 
      success: false, 
      error: err.message,
      details: err.raw ? err.raw.message : 'Unknown error'
    });
  }
});

// === 5. OLD API: Keep for backward compatibility (not used with form) ===
app.post("/api/proposals/:id/checkout", async (req, res) => {
  const id = req.params.id;
  const prop = proposals.find((p) => p.id === id);

  if (!prop) {
    return res.status(404).json({ error: "Proposal not found" });
  }

  const gross = addStripeFee(prop.amountNet);

  // recurring → subscription, інакше → одноразовий платіж
  const isSubscription = !!prop.recurring;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: isSubscription ? "subscription" : "payment",
      line_items: [
        {
          price_data: {
            currency: prop.currency,
            product_data: { name: prop.title },
            unit_amount: gross,
            ...(isSubscription
              ? { recurring: { interval: prop.interval || "month" } }
              : {}),
          },
          quantity: 1,
        },
      ],
      // 🔹 Для підписок додаємо trial і метадані
      ...(isSubscription
        ? {
            subscription_data: {
              trial_period_days: prop.trialDays || 0,
              metadata: {
                proposal_id: prop.id,
                client_name: prop.clientName,
                // 👇 якщо cancellationMonths === 1 → це "один місяць і до побачення"
                one_month_only:
                  prop.interval === "month" &&
                  prop.cancellationMonths === 1
                    ? "true"
                    : "false",
              },
            },
          }
        : {}),
      success_url: `${BASE_URL}/p/${prop.id}?status=success`,
      cancel_url: `${BASE_URL}/p/${prop.id}?status=cancel`,
      metadata: {
        proposal_id: prop.id,
        client_name: prop.clientName,
      },
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("Stripe error:", err);
    res.status(500).json({ error: err.message });
  }
});

// === 5. Webhook: після першого успішного платежу відрубати підписку, якщо one_month_only === true ===

// ⚠️ Для продакшена ОБОВʼЯЗКОВО додай перевірку підпису (endpointSecret).
// Тут для простоти парсимо без валідації (ок для тестів).
app.post("/webhook", (req, res) => {
  let event;

  try {
    // Handle both raw body and parsed JSON
    if (typeof req.body === 'string') {
      event = JSON.parse(req.body);
    } else if (Buffer.isBuffer(req.body)) {
      event = JSON.parse(req.body.toString());
    } else {
      event = req.body;
    }
  } catch (err) {
    console.error("Webhook JSON parse error:", err);
    return res.status(400).send(`Webhook error: ${err.message}`);
  }

  if (event.type === "invoice.payment_succeeded") {
    const invoice = event.data.object;
    const subscriptionId = invoice.subscription;

    if (subscriptionId) {
      // робимо async-обробку
      handleInvoicePaymentSucceeded(subscriptionId).catch((err) =>
        console.error("handleInvoicePaymentSucceeded error:", err)
      );
    }
  }

  res.json({ received: true });
});

async function handleInvoicePaymentSucceeded(subscriptionId) {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  const meta = subscription.metadata || {};
  const oneMonthOnly = meta.one_month_only === "true";

  if (oneMonthOnly && !subscription.cancel_at_period_end) {
    await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
    console.log(
      `🔁 Підписку ${subscriptionId} позначено як "скасувати в кінці першого періоду"`
    );
  }
}

const PORT = process.env.PORT || 4242;

console.log('About to start listening on port:', PORT);
console.log('VERCEL env var:', process.env.VERCEL);

// Export for Vercel serverless
if (process.env.VERCEL) {
  console.log('Exporting for Vercel');
  module.exports = app;
} else {
  console.log('Starting local server...');
  app.listen(PORT, () => {
    console.log(`✅ Server running on ${BASE_URL}`);
  });
}
