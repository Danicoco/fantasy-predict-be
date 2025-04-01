const jwt = require('jsonwebtoken');
const User = require('../model/user');
const { error } = require('../utils/common');

async function verify(req, res, next) {
  try {
    const token = req.get("Authorization").split(' ');
    if (!token) return error(res, "Unathorized Request", 403);
    if (token[0] !== "Bearer") return error(res, "Unathorized Request", 403);
    const verification = jwt.verify(token[1], process.env.JWT_SECRET);
    const user = await User.findOne({ _id: verification.id });
    if (!user) return error(res, "You're not allowed to perform this action");
    req.user = { ...user, id: user._id };
    return next();
  } catch (err) {
    return error(res, "Unathorize to go ahead")
  }
}

module.exports = verify;
