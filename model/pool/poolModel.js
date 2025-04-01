const mongoose = require("mongoose");

const poolSchema = new mongoose.Schema(
  {
    visibility: {
      type: String,
      enum: ["public", "private"],
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    amount: {
      type: Number,
      default: 0,
    },
    invitationCode: {
      type: String,
      unique: true,
      sparse: true,
    },
    numberOfUsers: {
      type: Number,
      default: 1,
    },
    creator: {
      type: "String",
      ref: "User",
      required: true,
    },
    fromMatchDay: { type: "Number" },
    toMatchDay: { type: "Number" },
    endOfSeason: { type: "Boolean" },
  },
  {
    timestamps: true,
  }
);

const Pool = mongoose.model("Pool", poolSchema);

module.exports = Pool;

//cronjobs
