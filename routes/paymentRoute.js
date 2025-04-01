const express = require('express');
const router = express.Router();
const paystackController = require('../controller/paymentController/payment');
const recipientController = require('../controller/paymentController/recipient');
const verify = require('../middleware/authMiddleWare');

router.post('/createRecipient', verify, recipientController.createRecipient);
 router.get('/getBankCode', recipientController.getBankCode);
 router.get('/getAllBanks', recipientController.getAllBanks);


router.post('/withdraw', verify, paystackController.withdraw);
router.post('/finalizeWithdraw',verify, paystackController.finalizeWithdraw);


module.exports = router;
