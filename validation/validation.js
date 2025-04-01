const Joi = require("@hapi/joi");
const axios = require("axios");
const SECRET_KEY = process.env.PUBLIC_KEY;

function validateUserRegister(user) {
  const Schema = Joi.object().keys({
    email: Joi.string().email().required(),
    gender: Joi.string().required(),
    password: Joi.string().min(5).max(20).required(),
    firstName: Joi.string().required(),
    lastName: Joi.string().required(),
    dob: Joi.string().required(),
    phoneNumber: Joi.string().required(),
    fcmToken: Joi.string().required(),
  });

  return Schema.validate(user);
}

function validatePasswordReset(user) {
  const Schema = Joi.object().keys({
    token: Joi.string().max(50).required(),
    password: Joi.string().min(5).max(20).required(),
    confirmPassword: Joi.string().min(5).max(20).required(),
  });

  return Schema.validate(user);
}

function validatePasswordChange(user) {
  const Schema = Joi.object().keys({
    password: Joi.string().min(5).max(20).required(),
    newPassword: Joi.string().min(5).max(20).required(),
    confirmNewPassword: Joi.string().min(5).max(20).required(),
  });

  return Schema.validate(user);
}

function validateUserPin(user) {
  const Schema = Joi.object().keys({
    pin: Joi.string().min(4).required(),
    confirmPin: Joi.string().min(4).required(),
  });

  return Schema.validate(user);
}

function validateChangePin(user) {
  const Schema = Joi.object().keys({
    currentPin: Joi.string().min(4).max(6).required(),
    pin: Joi.string().min(4).max(6).required(),
    confirmPin: Joi.string().min(4).max(6).required(),
  });

  return Schema.validate(user);
}

function validateInitializedTransaction(user) {
  const Schema = Joi.object().keys({
    payment_date: Joi.string().required(),
    reference: Joi.string().required(),
    amount: Joi.string().required(),
  });

  return Schema.validate(user);
}

const validateAccount = async (accountNumber, bankCode) => {
  try {
    const response = await axios.get(
      `https://api.paystack.co/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
      {
        headers: {
          Authorization: `Bearer ${SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error("Error resolving bank account:", error);
    if (
      error.response &&
      error.response.data &&
      error.response.data.message ===
        "Could not resolve account name. Check parameters or try again."
    ) {
      throw new Error(
        "Error validating account: Could not resolve account name. Check parameters or try again."
      );
    } else {
      throw new Error("Error resolving bank account");
    }
  }
};

exports.validateUserRegister = validateUserRegister;
exports.validateUserPin = validateUserPin;
exports.validateChangePin = validateChangePin;
exports.validatePasswordReset = validatePasswordReset;
exports.validatePasswordChange = validatePasswordChange;
exports.validateInitializedTransaction = validateInitializedTransaction;
exports.validateAccount = validateAccount;
