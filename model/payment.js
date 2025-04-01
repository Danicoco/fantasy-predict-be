const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema(
  {
    userId: {
      type: "String",
      index: true,
      ref: 'User',
    },
  
    reference: {
      type: String,
    },
    
    amount: {
      type: Number,
      required: true,
    },
    payment_date: {
      type: String,
    },
      recipient: {
          type: String,
          required: true,
      },
      reason: {
          type: String,
          required: true,
      },
  },
  {
    timestamps: true,
  }
);

mongoose.models = {};

const Payment = mongoose.model(
  'Payment',
  PaymentSchema
);

module.exports = Payment;
