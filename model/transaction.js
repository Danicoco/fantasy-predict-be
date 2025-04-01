// models/Transaction.js

const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    user: {
      type: "String",
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["debit", "credit"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    description: String,
  },
  {
    timestamps: true,
  }
);

const Transaction = mongoose.model("Transaction", transactionSchema);

module.exports = Transaction;
