// routes/transactionRoutes.js

const express = require('express');
const router = express.Router();
const transactionController = require('../controller/transactionController/transaction');
const verify = require('../middleware/authMiddleWare');


// Route for fetching all transactions for a user
router.get('/get-transactions/:userId',verify, transactionController.getTransactionsForUser);

module.exports = router;
