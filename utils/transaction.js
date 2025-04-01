

const Transaction = require('../model/transaction');

const createTransaction = async (userId, type, amount, description) => {
    try {
        await Transaction.create({
            userId,
            type,
            amount,
            description
        });
    } catch (error) {
        console.error('Error creating transactionController:', error);
    }
};

module.exports = { createTransaction };
