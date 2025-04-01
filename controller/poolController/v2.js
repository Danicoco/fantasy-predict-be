const Pool = require("../../model/pool/poolModel");
const Wallet = require("../../model/wallet");
const { error } = require("../../utils/common");
const { startSession } = require("mongoose");
const { poolDoc, sendNotification } = require("./helper");
const { debitWallet } = require("../transactionController/helper");
const Participant = require("../../model/participant");
const Pin = require("../../model/pin");
const { decrytData } = require("../../utils/hash");
const axios = require("axios");

exports.create = async (req, res) => {
  const { name, amount, fromMatchDay, toMatchDay, endOfSeason } = req.body;
  const { id, fcmTokens } = req.user;
  try {
    const [pool, wallet, pin] = await Promise.all([
      Pool.findOne({ name, creator: id }),
      Wallet.findOne({ user: id }),
      Pin.findOne({ user: id }),
    ]);

    if (!pin) return error(res, "You must create your transaction pin");
    if (decrytData(pin.pin) !== req.body.pin) return error(res, "Invalid Pin");
    if (pool) return error(res, "You cannot create a pool with this name");
    if (!wallet)
      return error(
        res,
        "There is an issue processing your request. Please try again",
        404
      );

    let hasEnoughAmount = false;

    if (Number(amount)) {
      if (endOfSeason) {
        const totalAmount = Number(amount) * 31;
        hasEnoughAmount = wallet.balance > totalAmount;
      }

      if (fromMatchDay && toMatchDay) {
        const totalAmount =
          Number(amount) * (Number(toMatchDay) - Number(fromMatchDay));
        hasEnoughAmount = wallet.balance > totalAmount;
      }

      if (!hasEnoughAmount) return error(res, "Your balance is insufficient");
    }

    const session = await startSession();
    await session.withTransaction(async () => {
      const pool = await Pool.create([poolDoc(req)], { session });
      Number(amount) &&
        (await debitWallet({
          user: id,
          amount,
          description: `Create pool ${name}`,
        }));
      await Participant.create([{ amount, user: id, pool: pool[0]._id }], {
        session,
      });
    });
    await session.endSession();

    sendNotification(fcmTokens, {
      title: "Pool Created!",
      body: `Your pool "${name}" is live! Invite others to join you`,
    });
    if (amount) {
      sendNotification(fcmTokens, {
        title: "Wallet Debited",
        body: `${amount} deducted for your pool "${name}".`,
      });
    }

    return res.status(201).json({ success: true, data: "Pool created" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.join = async (req, res) => {
  const { id, fcmTokens } = req.user;
  const { _id } = req.params;
  try {
    const [pool, wallet, pin, member] = await Promise.all([
      Pool.findOne({ _id }),
      Wallet.findOne({ user: id }),
      Pin.findOne({ user: id }),
      Participant.findOne({ user: id, pool: _id })
    ]);

    if (!pin) return error(res, "You must create your transaction pin");
    if (decrytData(pin.pin) !== req.body.pin) return error(res, "Invalid Pin");
    if (member) return error(res, "You are already a member of this pool");
    if (!pool) return error(res, "Pool does not exist");
    if (String(pool.creator) === String(id))
      return error(res, "You are already a member");
    if (!wallet)
      return error(
        "There is an issue processing your request. Please try again",
        404
      );

    let hasEnoughAmount = false;

    if (Number(pool.amount)) {
      if (pool.endOfSeason) {
        // get current matchday
        const totalAmount = Number(pool.amount) * 31;
        hasEnoughAmount = wallet.balance > totalAmount;
      }

      if (pool.fromMatchDay && pool.toMatchDay) {
        // get current matchday
        const totalAmount =
          Number(pool.amount) *
          (Number(pool.toMatchDay) - Number(pool.fromMatchDay));
        hasEnoughAmount = wallet.balance > totalAmount;
      }

      if (!hasEnoughAmount) return error(res, "Your balance is insufficient");
    }

    const session = await startSession();
    await session.withTransaction(async () => {
      await Pool.updateOne(
        { _id: pool._id },
        { $inc: { numberOfUsers: 1 } },
        { session }
      );
      Number(pool.amount) &&
        (await debitWallet({
          user: id,
          amount: pool.amount,
          description: `Create pool ${pool.name}`,
        }));
      await Participant.create(
        [
          {
            amount: pool.amount,
            user: id,
            pool: pool._id,
          },
        ],
        { session }
      );
    });
    await session.endSession();

    if (pool.amount) {
      sendNotification(fcmTokens, {
        title: "Wallet Debited",
        body: `${pool.amount} deducted for joining pool "${pool.name}".`,
      });
    }

    return res
      .status(201)
      .json({ success: true, data: "Joined Pool Successfully" });
  } catch (err) {
    return error(res, "Server Error", 500);
  }
};

exports.members = async (req, res) => {
  const { leaderboard } = req.query;
  try {
    const participants = await Participant.find(
      { pool: req.params._id },
      {},
      {
        populate: [{ path: "user", select: "firstName lastName photo userName" }],
        ...(leaderboard && { sort: { totalPoint: -1 } }),
        ...(leaderboard && { limit: 10 }),
      }
    );

    return res.status(201).json({ success: true, data: participants });
  } catch (err) {
    return error(res, "Server Error", 500);
  }
};

// get list of pools
exports.fetch = async (req, res) => {
  const { visibility, name } = req.query;
  try {
    const pools = await Pool.find(
      { visibility: visibility || "public", ...(name && { name }) },
      {},
      {
        populate: [{ path: "creator", select: "firstName lastName photo userName" }],
        sort: { createdAt: -1 },
        limit: 15,
      }
    );

    return res.status(201).json({ success: true, data: pools });
  } catch (err) {
    return error(res, "Server Error", 500);
  }
};

// join private pools
exports.joinPrivate = async (req, res) => {
  const { id, fcmTokens } = req.user;
  const { invitationCode } = req.body;
  try {
    const [pool, wallet, pin] = await Promise.all([
      Pool.findOne({ invitationCode }),
      Wallet.findOne({ user: id }),
      Pin.findOne({ user: id }),
    ]);    
    
    if (!pin) return error(res, "You must create your transaction pin");
    if (decrytData(pin.pin) !== req.body.pin) return error(res, "Invalid Pin");
    if (!pool) return error(res, "Pool does not exist");
    const member = Participant.findOne({ user: id, pool: pool._id });
    if (member) return error(res, "You are already a member of this pool");
    if (String(pool.creator) === String(id))
      return error(res, "You are already a member");
    if (!wallet)
      return error(
        "There is an issue processing your request. Please try again",
        404
      );

    let hasEnoughAmount = false;

    if (Number(pool.amount)) {
      if (pool.endOfSeason) {
        // get current matchday
        const totalAmount = Number(pool.amount) * 31;
        hasEnoughAmount = wallet.balance > totalAmount;
      }

      if (pool.fromMatchDay && pool.toMatchDay) {
        // get current matchday
        const totalAmount =
          Number(pool.amount) *
          (Number(pool.toMatchDay) - Number(pool.fromMatchDay));
        hasEnoughAmount = wallet.balance > totalAmount;
      }

      if (!hasEnoughAmount) return error(res, "Your balance is insufficient");
    }

    const session = await startSession();
    await session.withTransaction(async () => {
      await Pool.updateOne(
        { _id: pool._id },
        { $inc: { numberOfUsers: 1 } },
        { session }
      );
      Number(pool.amount) &&
        (await debitWallet({
          user: id,
          amount: pool.amount,
          description: `Create pool ${pool.name}`,
        }));
      await Participant.create(
        [
          {
            amount: pool.amount,
            user: id,
            pool: pool._id,
          },
        ],
        { session }
      );
    });
    await session.endSession();

    if (pool.amount) {
      sendNotification(fcmTokens, {
        title: "Wallet Debited",
        body: `${pool.amount} deducted for joining pool "${pool.name}".`,
      });
    }

    return res
      .status(201)
      .json({ success: true, data: "Joined Pool Successfully" });
  } catch (err) {
    return error(res, "Server Error", 500);
  }
};

// current match week
// matchweek history
// (async () => {
//   const { data } = await axios.get('https://fantasy.premierleague.com/api/fpl/');
//   // console.log(data[data.length - 1]);
// })();