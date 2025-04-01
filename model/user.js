const mongoose = require("mongoose");
const validator = require("validator");
const { decrytData, encryptData } = require("../utils/hash");

const UserSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      trim: true,
      required: true,
      validate: [validator.isEmail, "Please provide a valid email"],
    },
 
    phoneNumber: {
      type: String,
      default: null,

    },
    password: {
      type: String,
      required: true,
      minLength: 6,
      select: false,
    },
    userName: {
      type: String,
      maxlength: 30,
    },

    firstName: {
      type: String,
      maxlength: 30,
    },

    lastName: {
      type: String,
      index: true,
    },
    
    photo: {
      type: String,
      default: null,
    },
   
    verified: {
      type: Boolean,
      default: false,
    },
    gender: {
        type: String,
        enum: ["male", "female"],
    },
    dob: {
        type: String,
    },
    acceptTermsAndConditions: {
      type: Boolean,
      default: false,
    },
    rememberToken: {
      token: {
        type: String,
        default: null,
      },
      expiredDate: {
        type: Date,
        default: null,
      },
    },
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    active: {
      type: Boolean,
      default: true,
      select: false,
    },
      fcmTokens: [{ // Update to store multiple FCM tokens
          type: String,
          default: null,
      }],
  },
  {
    timestamps: true,
  }
);
UserSchema.index({ userName: "text", fullName: "text", email: "text" });

UserSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return candidatePassword === decrytData(userPassword)
};

const User = mongoose.model("User", UserSchema);

module.exports = User;