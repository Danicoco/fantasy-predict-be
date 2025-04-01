const axios = require("axios");
const https = require("https");

const Wallet = require("../../model/wallet");
const { createTransaction } = require("../../utils/transaction");
const sendPushNotification = require("../../utils/firebase");

const SECRET_KEY = process.env.PUBLIC_KEY;

exports.initiatePayment = async (req, res) => {
  try {
    const { userId, amount, email } = req.body; // Make sure email is included in the request body

    if (!email) {
      return res
        .status(400)
        .json({ success: false, error: "Email Address is required" });
    }

    let wallet = await Wallet.findOne({ userId: userId });
    if (!wallet) {
      wallet = new Wallet({
        userId: userId,
        balance: 0,
      });
      await wallet.save();
    }

    const params = {
      email: email, // Include the email address in the request payload
      userId: userId,
      amount: amount * 100,
    };

    const config = {
      headers: {
        Authorization: `Bearer ${SECRET_KEY}`,
        "Content-Type": "application/json",
      },
    };

    const paymentResponse = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      params,
      config
    );

    const paymentResult = paymentResponse.data;
    console.log(paymentResult);

    if (paymentResult.status === true) {
      const reference = paymentResult.data.reference;
      // Return the authorization URL instead of redirecting
      res
        .status(200)
        .json({
          success: true,
          message: "Payment initialized successfully",
          authorization_url: paymentResult.data.authorization_url,
          reference: reference,
        });
    } else {
      res.status(400).json({ success: false, error: "Payment failed" });
    }
  } catch (error) {
    console.error("Error initiating payment:", error);
    res.status(500).json({ success: false, error: "Error initiating payment" });
  }
};

exports.verifyTransaction = async (req, res) => {
  try {
    const { reference } = req.params;

    const options = {
      method: "GET",
      url: `https://api.paystack.co/transaction/verify/${reference}`,
      headers: {
        Authorization: `Bearer ${SECRET_KEY}`,
      },
    };

    const response = await axios(options);
    const verificationResult = response.data;

    if (
      verificationResult.status &&
      verificationResult.data.status === "success"
    ) {
      // Transaction verification is successful
      const amountVerified = verificationResult.data.amount / 100; // Convert amount from kobo to naira

      // Update wallet balance with the verified amount
      const wallet = await Wallet.findOneAndUpdate(
        { userId: req.user.id }, // Assuming you have a user ID in the request object
        { $inc: { balance: amountVerified } }, // Increment wallet balance by the verified amount
        { new: true } // Return the updated wallet document
      );

      // Create transactionController record for the stake amount deduction
      await createTransaction(
        req.user.id,
        "credit",
        amountVerified,
        "Credit into wallet"
      );

      // Send notification for successful deposit
      const notificationData = {
        title: "Deposit Successful!",
        body: `You have successfully deposited ${amountVerified} into your wallet.`,
      };

      // Send notification to each FCM token in the user's array
      for (const token of req.user.fcmTokens) {
        await sendPushNotification({ ...notificationData, token });
      }

      res
        .status(200)
        .json({
          success: true,
          message: "Transaction verified successfully",
          wallet: wallet,
        });
    } else {
      // Transaction verification failed or status is not 'success'
      res
        .status(400)
        .json({ success: false, error: "Transaction verification failed" });
    }
  } catch (error) {
    // Transaction verification failed or status is not 'success'
    // Send notification for unsuccessful deposit
    const notificationData = {
      title: "Deposit Unsuccessful!",
      body: `Your deposit was unsuccessful. Please try again.`,
    };

    // Send notification to each FCM token in the user's array
    for (const token of req.user.fcmTokens) {
      await sendPushNotification({ ...notificationData, token });
    }

    console.error("Error verifying transactionController:", error);
    res
      .status(500)
      .json({ success: false, error: "Error verifying transactionController" });
  }
};

exports.getWalletBalance = async (req, res) => {
  const { id } = req.user;
  console.log({id});
  try {
    let wallet = await Wallet.findOne({ user: id });

    if (!wallet) {
      wallet = await new Wallet({
        user: id,
        balance: 0,
      }).save();
    }

    res.status(200).json({ success: true, wallet });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
