const Transaction = require("../../model/transaction");
const Wallet = require("../../model/wallet");

const transactionDoc = (amount, description) => {
  return {
    amount: Number(amount),
    description,
  };
};

exports.debitWallet = async ({ user, amount, description }, session) => {
  await Promise.all([
    Wallet.updateOne({ user }, { $inc: { balance: -amount }, lastTransaction: new Date()}, { session }),
    Transaction.create(
      [{ ...transactionDoc(amount, description), user, type: "debit", description }],
      { session }
    ),
  ]);
};
