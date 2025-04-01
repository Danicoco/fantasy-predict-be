const express = require('express');
const router = express.Router();
const walletController = require('../controller/walletController/createWallet');
const verify = require('../middleware/authMiddleWare');

router.post('/initiatePayment', walletController.initiatePayment);
router.get('/verifyTransaction/:reference', walletController.verifyTransaction);
router.get('/', walletController.getWalletBalance);

module.exports = router;