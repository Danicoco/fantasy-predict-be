const mongoose = require("mongoose");

const walletSchema = new mongoose.Schema(
  {
    user: {
      type: "String",
      required: true,
      unique: true,
    },
    balance: {
      type: Number,
      default: 0,
    },
    lastTransaction: { type: "Date", },
  },
  {
    timestamps: true,
  }
);

const Wallet = mongoose.model("Wallet", walletSchema);

module.exports = Wallet;
