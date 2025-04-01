const User = require("../../model/user");
const Wallet = require("../../model/wallet");
const Recipient = require("../../model/recipient");
const _ = require("lodash");
const {
  validateUserRegister,
  validatePasswordReset,
} = require("../../validation/validation");
const {
  createSendToken,
  otpVerification,
  verificationLink,
  verificationToken,
  resetLink,
} = require("../../utils/generateToken");
const otpGenerator = require("otp-generator");

const moment = require("moment");
const { Mailer } = require("../../utils/mailer");

const {
  Verify,
  VerifyMobile,
  ResetPassword,
} = require("../../utils/emailTemplates");
const { decrytData, encryptData } = require("../../utils/hash");

const createUser = async (req, res) => {
  try {
    // Validate the user data
    let { error } = validateUserRegister(req.body);

    // Check if there was an error
    if (error) return res.status(400).send(error.details[0].message);

    const {
      email,
      password,
      firstName,
      gender,
      lastName,
      phoneNumber,
      dob,
      fcmToken, // Add fcmToken here
    } = req.body;

    const emailExist = await User.findOne({ email });

    // Check if email exists
    if (emailExist)
      return res.status(400).json({ message: "User already exists" });

    const user = new User({
      email,
      password: encryptData(password),
      gender,
      firstName,
      lastName,
      dob,
      phoneNumber,
      fcmTokens: [fcmToken], // Include fcmToken in user creation
    });

    await user.save();

    // Generate verification key
    const verificationKey = otpVerification();

    // Prepare email subject and content
    const token = verificationKey;
    const subject = `Kindly use this code to complete your registration`;

    // Send verification email
    // const html = VerifyMobile(user.firstName, verificationKey);
    // Mailer(user.email, subject, html, user.firstName);

    // Update user with verification token
    await user.updateOne({
      rememberToken: { token, expiredDate: moment().add(1, "days") },
    });

    // Send response to client
    res.status(200).json({
      status: "success",
      message: "An email has been sent to you for verification",
      token,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: "error", message: "Something went wrong" });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password, fcmToken } = req.body;
    if (!email) return res.status(400).json({ message: "please add email" });

    if (!password)
      return res.status(400).json({ message: "please add password" });

    // 2) Check if user exists && password is correct
    const user = await User.findOne({ email }).select("+password +active");

    if (!user || !(await user.correctPassword(password, user.password))) {
      return res
        .status(403)
        .json({ status: "message", message: "invalid credentials" });
    }

    if (!user.verified) return handleResendVerification(user, res);

    // Update user's FCM tokens array with the new token, if provided
    if (fcmToken && !user.fcmTokens.includes(fcmToken)) {
      user.fcmTokens.push(fcmToken);
      await user.save();
    }

    // 3) Check if the user has a recipient code
    const recipient = await Recipient.findOne({ userId: user._id });
    console.log(recipient);
    // 4) If user has a recipient code, include it in the response
    // if (recipient) {
    //   // Populate recipient data if needed
    //   await recipient.populate('userId').execPopulate();
    //
    //   return res.status(200).json({
    //     status: 'success',
    //     message: 'login successful',
    //     recipient: recipient
    //   });
    // }

    // 5) If everything is OK but user does not have a recipient code
    return createSendToken(user, 200, req, res, recipient);
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: "error", message: "something went wrong" });
  }
};

const VerifyRegisteredAccount = async (req, res) => {
  try {
    const token = req.body.token;

    if (!token)
      return res
        .status(400)
        .json({ status: "error", message: "Token is required" });

    const currentDate = new Date();

    const user = await User.findOne({
      "rememberToken.token": token,
      verified: false,
      "rememberToken.expiredDate": { $gte: currentDate },
    });

    if (!user)
      return res
        .status(400)
        .json({ status: "error", message: "Your session has expired." });

    await user.updateOne({
      verified: true,
      rememberToken: null,
    });

    createSendToken(user, 200, req, res);
  } catch (error) {
    console.log(error);
    return res.status(400).send("Something went wrong");
  }
};

const handleResendVerification = async (user, res) => {
  ////check for versions and use verification types ///////
  const verificationKey = otpVerification();

  const token = verificationKey;
  const subject = `Kindly use this code to complete your registration `;
  //// sms////////////
  // SMS(phoneNumber, user.fullName, subject);

  const html = VerifyMobile(user.firstName, verificationKey);

  ///email //////////////////////////////////
  Mailer(user.email, subject, html, user.firstName);
  await user.updateOne({
    rememberToken: { token, expiredDate: moment().add(1, "days") },
  });
  user.password = undefined;
  return res.status(401).json({
    status: "success",
    message: "An email has been sent to you for verification",
    data: user,
  });
};

const ResetAccount = async (req, res) => {
  try {
    const email = req.body.email;

    const user = await User.findOne({ email });

    if (!user)
      return res.status(404).json({
        status: "error",
        message: "email is not registered.",
      });

    const resetKey = otpVerification();

    const token = resetKey;
    const expiredDate = moment().add(1, "hours");

    await user.updateOne({
      rememberToken: {
        token,
        expiredDate,
      },
    });

    const subject = `Kindly use this ${"code"} to reset your account `;

    //// sms////////////

    const html = VerifyMobile(user.firstName, resetKey);

    ///email //////////////////////////////////
    Mailer(user.email, subject, html, user.firstName);

    return res.status(200).json({
      status: "success",
      message: "Password reset token has been sent to your mail.",
      token,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: "error",
      message: "something went wrong. Please try again",
    });
  }
};
const editUserProfile = async (req, res) => {
  try {
    const { user } = req;
    const userId = user.id;

    // Extract the fields to update from the request body
    const { firstName, lastName, phoneNumber, userName, photo, gender, dob } =
      req.body;

    // Find the user by ID and update the fields
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        firstName,
        lastName,
        phoneNumber,
        userName,
        photo,
        gender,
        dob,
      },
      { new: true }
    );

    // Check if the user was found and updated successfully
    if (!updatedUser) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.status(200).json({ success: true, user: updatedUser });
  } catch (error) {
    console.error("Error editing user profile:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const handleChangePassword = async (req, res) => {
  try {
    // validate the user data
    let { error } = validatePasswordReset(req.body);

    // check if there was error
    if (error) return res.status(400).send(error.details[0].message);

    let token = req.body.token;
    let password = req.body.password;
    let confirmPassword = req.body.confirmPassword;

    if (password !== confirmPassword)
      return res.status(400).json({
        status: "error",
        message: "Your new password doesn't match your confirm password.",
      });

    let currentDate = new Date().valueOf();

    let user = await User.findOne({
      "rememberToken.token": token,
      "rememberToken.expiredDate": { $gte: currentDate },
    });

    if (!user)
      return res.status(404).json({
        status: "error",
        message: "Token already expired. Please reset password again.",
      });

    // now if the current provided is a match then
    let newPass = encryptData(password);
    newPass = newPass.replace("$2b$", "$2y$");

    // update the user password
    await user.updateOne({ password: newPass });

    return res.status(200).json({
      status: "success",
      message: "Password successfully changed.",
    });
  } catch (error) {
    console.log("error", error);
    return res.status(500).json({
      status: "error",
      message: "something went wrong. Please try again",
    });
  }
};

const ResendEmailVerification = async (req, res) => {
  try {
    const email = req.query.email;

    const user = await User.findOne({ email });

    console.log("church", user);

    if (!user)
      return res
        .status(404)
        .json({ status: "error", message: "user not found" });

    const verificationKey =
      user.createdVersion === "mobile" ? otpVerification() : verificationLink();

    const token =
      user.createdVersion === "mobile"
        ? verificationKey
        : verificationKey.token;

    const expiredDate = moment().add(5, "hours");
    const currentDate = new Date();
    const time = 1 * 60 * 1000;
    const difference = currentDate - user.rememberToken.expiredDate;

    // return res.status(400).json({
    //   status: 'error',
    //   message: "'You have to wait for about 60 seconds to try again'",
    // });

    await user.updateOne({
      rememberToken: {
        token,
        expiredDate,
      },
    });

    const subject = `Kindly use this ${
      user.createdVersion === "mobile" ? "code" : "link"
    } to complete your registration `;
    //// sms////////////
    SMS(user.phoneNumber, user.fullName, subject);

    const html =
      user.createdVersion === "mobile"
        ? VerifyMobile(user.fullName, verificationKey)
        : Verify(user.fullName, verificationKey.url);
    ///email //////////////////////////////////
    Mailer(user.email, html, user.fullName, subject);
    return res.status(200).json({
      status: "success",
      message: "Email has been resent.",
    });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ status: "error", message: "something went wrong" });
  }
};

const GetEmailVerificationValidity = async (req, res) => {
  try {
    const token = req.body.token;

    const user = await User.findOne({
      "rememberToken.token": token,
    });

    if (!user)
      return res
        .status(400)
        .json({ status: "error", message: "Your session has expired." });

    console.log("user", user);

    const currentDate = new Date();

    if (currentDate > user.rememberToken.expiredDate)
      return res.status(400).json({
        status: "error",
        message: "Token has expired. Please resend new token",
      });

    return res.status(200).json({
      status: "success",
      message: "Token is valid",
    });
  } catch (error) {
    console.log(error);
    return res
      .status(400)
      .json({ status: "error", message: "something went wrong" });
  }
};

const getUserById = async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Fetch wallet information
    const wallet = await Wallet.findOne({ userId: user._id });

    // Fetch recipient information
    const recipient = await Recipient.findOne({ userId: user._id });

    // Combine user, wallet, and recipient data
    const userData = {
      user,
      wallet,
      recipient,
    };

    res.json(userData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const changePassword = async (req, res) => {
  try {
    const { userId, currentPassword, newPassword, confirmNewPassword } =
      req.body;

    // Find the user by userId
    const user = await User.findById(userId).select("+password");
    // Check if the user exists
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Compare currentPassword with hashed password in the database
    if (!decrytData(user.password) === currentPassword) {
      return res.status(400).json({ error: "Incorrect current password" });
    }

    if (newPassword !== confirmNewPassword) {
      return res
        .status(401)
        .json({ success: false, message: "new password mismatched " });
    }
    let newPass = encryptData(newPassword);
    newPass = newPass.replace("$2b$", "$2y$");

    user.password = newPassword;
    await user.save();

    res
      .status(200)
      .json({ success: true, message: "Password changed successfully" });
  } catch (error) {
    console.error("Error changing password:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};

module.exports = {
  loginUser,
  createUser,
  VerifyRegisteredAccount,
  ResetAccount,
  handleChangePassword,
  ResendEmailVerification,
  GetEmailVerificationValidity,
  getUserById,
  editUserProfile,
  changePassword,
};
