const mongoose = require("mongoose");

const poolSchema = new mongoose.Schema(
  {
    pool: {
      type: "String",
      index: true,
      ref: "Pool",
    },
    user: {
      type: "String",
      index: true,
      ref: "User",
    },
    amount: {
      type: Number,
      default: 0,
    },
    totalPoint: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const Participant = mongoose.model("Participant", poolSchema);

module.exports = Participant;
