const jwt = require('jsonwebtoken');
const otpGenerator = require('otp-generator');

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createSendToken = (user, statusCode, req, res, recipient) => {
  const token = signToken(user._id);

  // Remove password from output
  user.password = undefined;

  res.header('x-auth', token).status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
      recipient, // Include recipient data in the response under the 'data' object
    },
  });
};




const verificationToken = (num) => {
  var text = '';
  const possible =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (var i = 0; i < num; i++)
    text += possible.charAt(Math.floor(Math.random() * possible.length));

  return text;
};

const verificationLink = () => {
  const token = verificationToken(50);
  const appUrl = process.env.APP_URL;
  const url = `${appUrl}/email_verify/${token}`;

  return { url, token };
};

const resetLink = () => {
  const token = verificationToken(50);
  const appUrl = process.env.APP_URL;
  const url = `${appUrl}/email_reset/${token}`;

  return { url, token };
};

const otpVerification = () => {
  ////generate otp //////////////////
  const code = otpGenerator.generate(4, {
    upperCaseAlphabets: false,
    specialChars: false,
    lowerCaseAlphabets: false,
    digits: true,
  });

  return code;
};
exports.createSendToken = createSendToken;
exports.verificationLink = verificationLink;
exports.otpVerification = otpVerification;
exports.verificationToken = verificationToken;
exports.resetLink = resetLink;