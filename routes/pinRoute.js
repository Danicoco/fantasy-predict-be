const express = require('express');
const router = express.Router();
const verify = require('../middleware/authMiddleWare');
const {
  createPin,
  getPinStatus,
  changePin,
} = require('../controller/pinController/pin');

router.post('/', verify, createPin);
router.get('/', verify, getPinStatus);
router.post('/change', verify, changePin);

module.exports = router;
