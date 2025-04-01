const axios = require('axios');
const Payment = require('../../model/payment');
const Wallet = require('../../model/wallet');
const {createTransaction} = require("../../utils/transaction");
const sendPushNotification = require("../../utils/firebase");

// Paystack API secret key
const SECRET_KEY = process.env.PUBLIC_KEY;

exports.withdraw = async (req, res) => {
    try {
        const { amount, recipient, reason } = req.body;

        // Retrieve the user's balance from the database
        const userBalance = await Wallet.findOne({ userId: req.user.id }); // Assuming userId is available in the request object

        if (!userBalance) {
            return res.status(400).json({ success: false, error: 'User balance not found' });
        }

        // Check if the withdrawal amount is greater than the user's balance
        if (amount > userBalance.balance) {
            return res.status(400).json({ success: false, error: 'Withdrawal amount exceeds user balance' });
        }

        // Make request to Paystack API to initiate withdrawal
        const response = await axios.post(
            'https://api.paystack.co/transfer',
            {
                source: 'balance',
                amount: amount * 100, // Paystack expects amount in kobo (multiply by 100)
                recipient: recipient, // Paystack recipient code or account number
                reason: reason,
            },
            {
                headers: {
                    Authorization: `Bearer ${SECRET_KEY}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        // Check if the response is successful and contains the expected data
        if (response && response.data && response.data.data && response.data.data.id) {
            console.log(response.data);
            // Save withdrawal details to the database
            // const newWithdrawal = new Payment({
            //     amount: amount,
            //     recipient: recipient,
            //     reason: reason,
            //     transactionId: response.data.data.id,
            // });
            // //await newWithdrawal.save();

            res.json({ success: true, message: 'Withdrawal initiated successfully',responseData: response.data });
        } else {
            // Handle case where response or response.data is undefined or does not contain expected data
            console.error('Invalid response from Paystack API');
            res.status(500).json({ success: false, error: 'Invalid response from Paystack API' });
        }
    } catch (error) {
        // Handle errors from Axios or Paystack API
        console.error('Error:', error.response ? error.response.data : error.message);
        res.status(500).json({ success: false, error: error.response ? error.response.data : error.message });
    }
};

exports.finalizeWithdraw = async (req, res) => {
    try {
        const { otp, transfer_code, amount, recipient, reason } = req.body;
        const {user} = req;
        console.log(user);

        // Retrieve the user's wallet balance from the database
        const userWallet = await Wallet.findOne({ userId: user.id });

        if (!userWallet) {
            return res.status(400).json({ success: false, error: 'User wallet not found' });
        }

        // Check if the withdrawal amount is higher than the user's balance
        if (amount > userWallet.balance) {
            return res.status(400).json({ success: false, error: 'Withdrawal amount exceeds user balance' });
        }

        // Deduct the withdrawal amount from the user's balance
        const updatedBalance = userWallet.balance - amount;

        // Update the user's balance in the database
        await Wallet.findOneAndUpdate({ userId: user.id }, { balance: updatedBalance });

        // Create transactionController record for the stake amount deduction
        await createTransaction(req.user.id, 'debit', amount, 'Withdrawal of ${amount} from wallet for ${reason}');


        // Make request to Paystack API to finalize transfer
        const response = await axios.post(
            'https://api.paystack.co/transfer/finalize_transfer',
            {
                source: 'balance',
                transfer_code: transfer_code,
                otp: otp,
                amount: amount * 100, // Paystack expects amount in kobo (multiply by 100)
                recipient: recipient, // Paystack recipient code or account number
                reason: reason,
            },
            {
                headers: {
                    Authorization: `Bearer ${SECRET_KEY}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        // Check if the response is successful and contains the 'data' property
        if (response && response.data) {
            console.log(response.data);
            // Save details of the finalized withdrawal to the database
            const finalize = new Payment({
                transfer_code: transfer_code,
                otp: otp,
                amount: amount,
                recipient: recipient,
                reason: reason,
                userId: user.id,

            });

            await finalize.save();

            // Send notification to the user about the successful transaction
            const notificationData = {
                title: "Withdrawal Successful!",
                body: `Your withdrawal of ${amount} has been successfully processed.`,
            };

            // Send notification to each FCM token in the user's array
            for (const token of user.fcmTokens) {
                await sendPushNotification({ ...notificationData, token });
            }

            res.json({ success: true, message: 'Withdrawal successfully sent', responseData: response.data, balance: updatedBalance  });
        } else {

            // Send notification to the user about the failure to finalize the payment
            const notificationData = {
                title: "Payment Finalization Failed!",
                body: `Your withdrawal of ${amount} has not been finalized. Please try again.`,
            };

            // Send notification to each FCM token in the user's array
            for (const token of user.fcmTokens) {
                await sendPushNotification({ ...notificationData, token });
            }
            // Handle case where response or response.data is undefined
            console.error('Invalid response from Paystack API');
            res.status(500).json({ success: false, error: 'Invalid response from Paystack API' });
        }
    } catch (error) {
        // Handle errors from Axios or Paystack API
        console.error('Error:', error.response ? error.response.data : error.message);
        res.status(500).json({ success: false, error: error.response ? error.response.data : error.message });
    }
};



