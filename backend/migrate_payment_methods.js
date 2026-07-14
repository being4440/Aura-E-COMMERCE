const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });
const Order = require('./models/Order');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const codRes = await Order.updateMany({ paymentMethod: 'Cash on Delivery' }, { paymentMethod: 'cod' });
  const stripeRes = await Order.updateMany({ paymentMethod: { $in: ['Credit Card', 'Debit Card', 'UPI'] } }, { paymentMethod: 'stripe' });
  console.log('Migration complete. COD updated: ' + codRes.modifiedCount + ', Stripe updated: ' + stripeRes.modifiedCount);
  process.exit();
}).catch(e => {
  console.error(e);
  process.exit(1);
});
