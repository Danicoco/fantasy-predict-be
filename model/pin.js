const mongoose = require("mongoose");
const { decrytData } = require("../utils/hash");

const PinSchema = new mongoose.Schema(
  {
    user: {
      type: "String",
      index: true,
      ref: "User",
    },
    pin: {
      type: String,
      required: true,
    },
    created: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

PinSchema.methods.correctPassword = async function (candidatePin, userPin) {
  return decrytData(userPin) === candidatePin;
};

const Pin = mongoose.model("Pin", PinSchema);

module.exports = Pin;
