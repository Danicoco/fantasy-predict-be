const { Router } = require("express");

const router = Router();

const authRoute = require("./authRoute");
const pinRoute = require('./pinRoute');
const paymentRoutes = require('./paymentRoute')
const walletRoutes = require('./walletRoute')
const fplRoutes = require('./fplRoute')
const poolRoutes = require('./poolRoute')
const transactionRoutes = require('./transaction');
const verify = require("../middleware/authMiddleWare");

router.use("/v1/pins", pinRoute);
router.use("/v1/fpl", fplRoutes);
router.use("/v1/users", authRoute);
router.use("/v1/paystack", paymentRoutes);
router.use("/v1/pools", verify, poolRoutes);
router.use("/v1/wallets", verify, walletRoutes);
router.use("/v1/transaction", transactionRoutes);

module.exports = router;