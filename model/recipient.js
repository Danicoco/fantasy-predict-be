const mongoose = require("mongoose");

const recipientSchema = new mongoose.Schema(
  {
    recipientCode: {
      type: String,
    },
    name: {
      type: String,
      required: true,
    },
    accountNumber: {
      type: String,
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
      ref: "User",
    },
    bankCode: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

const Recipient = mongoose.model("Recipient", recipientSchema);

module.exports = Recipient;
