const User = require("../../model/user");
const Pin = require("../../model/pin");
const {
  validateUserPin,
  validateChangePin,
} = require("../../validation/validation");
const { encryptData } = require("../../utils/hash");

const createPin = async (req, res) => {
  try {
    let { error } = validateUserPin(req.body);
    // check if there was error
    if (error)
      return res
        .status(400)
        .json({ status: "error", message: error.details[0].message });
    const user = User.findById(req.user.id);
    const { pin, confirmPin } = req.body;

    if (pin !== confirmPin)
      return res
        .status(400)
        .json({ status: "error", message: "Pin provided didn't match" });
    const pinExist = await Pin.findOne({
      user: req.user.id,
    });
    if (pinExist)
      return res
        .status(400)
        .json({ status: "error", message: "pin already exist" });
    if (!user)
      res.status(404).json({ status: "error", message: "User not found" });

    let protectedPin = encryptData(pin)

    const newPin = await Pin.create({
      pin: protectedPin,
      user: user._id,
      created: true,
      user: req.user.id,
    });

    res
      .status(201)
      .json({ status: "success", message: "Pin created successfully" });
  } catch (error) {
    res.status(404).json({ status: "error", message: "something went wrong" });
  }
};

const getPinStatus = async (req, res) => {
  try {
    const falseStatus = {
      created: false,
    };
    const user = await User.findById(req.user.id);
    if (!user)
      return res
        .status(404)
        .json({ status: "error", message: "User not found" });
    const pinStatus = await Pin.findOne({ user: req.user.id });

    if (!pinStatus)
      return res.status(202).json({ status: "success", data: falseStatus });
    res.status(200).json({ status: "success", data: pinStatus });
  } catch (error) {
    res.status(404).json({ status: "error", message: "something went wrong" });
  }
};

const changePin = async (req, res) => {
  let { error } = validateChangePin(req.body);
  console.log("hey");
  // check if there was error
  if (error)
    return res
      .status(400)
      .json({ status: "error", message: error.details[0].message });

  const { pin, confirmPin, currentPin } = req.body;

  if (pin !== confirmPin)
    return res
      .status(400)
      .json({ status: "error", message: "Pin provided didn't match" });

  const user = await Pin.findOne({ user: req.user.id }).select("+pin");

  if (!user || !(await user.correctPassword(currentPin, user.pin))) {
    return res.status(401).json({ status: "message", message: "invalid pin " });
  }
  // now if the current provided is a match then
  let newPin = encryptData(pin)

  // update the user password
  await user.updateOne({ pin: newPin });

  res
    .status(200)
    .json({ status: "success", message: "Pin successfully Changed" });
};

exports.getPinStatus = getPinStatus;
exports.createPin = createPin;
exports.changePin = changePin;
