const Stripe = require('stripe');

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
    const { formData, amount } = req.body;

    // Validate required fields
    if (!formData || !amount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Step 1: Create a Stripe Customer
    const customer = await stripe.customers.create({
      name: `${formData.firstName} ${formData.lastName}`,
      email: formData.email || undefined,
      address: {
        line1: formData.addressLine1,
        line2: formData.addressLine2 || undefined,
        city: formData.city,
        state: formData.state,
        postal_code: formData.zipCode,
        country: 'US',
      },
      metadata: {
        companyName: formData.companyName,
        bankName: formData.bankName,
        accountType: formData.accountType,
      },
    });

    // Step 2: Create a Bank Account Token
    const token = await stripe.tokens.create({
      bank_account: {
        country: 'US',
        currency: 'usd',
        account_holder_name: `${formData.accountFirstName} ${formData.accountLastName}`,
        account_holder_type: 'individual',
        routing_number: formData.routingNumber,
        account_number: formData.accountNumber,
      },
    });

    // Step 3: Attach Bank Account to Customer
    const bankAccount = await stripe.customers.createSource(customer.id, {
      source: token.id,
    });

    // Step 4: Verify the bank account (micro-deposits in production)
    // In test mode, we can skip verification
    if (process.env.STRIPE_SECRET_KEY.includes('test')) {
      await stripe.customers.verifySource(
        customer.id,
        bankAccount.id,
        {
          amounts: [32, 45], // Test verification amounts
        }
      );
    }

    // Step 5: Create a charge
    const charge = await stripe.charges.create({
      amount: amount * 100, // Convert to cents
      currency: 'usd',
      customer: customer.id,
      source: bankAccount.id,
      description: `Bank Account Authorization - ${formData.firstName} ${formData.lastName}`,
      metadata: {
        customerName: `${formData.firstName} ${formData.lastName}`,
        bankName: formData.bankName,
        accountType: formData.accountType,
        authorizationDate: formData.signatureDate,
      },
    });

    return res.status(200).json({
      success: true,
      chargeId: charge.id,
      customerId: customer.id,
      message: 'Payment initiated successfully',
    });

  } catch (error) {
    console.error('Stripe Error:', error);
    return res.status(500).json({
      error: error.message || 'Payment processing failed',
      type: error.type,
    });
  }
}
