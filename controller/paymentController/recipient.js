const axios = require('axios');
const Recipient = require('../../model/recipient'); // Import your recipient model
const mongoose = require('mongoose');

// Paystack API secret key
const SECRET_KEY = process.env.PUBLIC_KEY;
const Bank = require('../../model/bank');
const {validateAccount} = require("../../validation/validation");

exports.getBankCode = async (req, res) => {
    try {
        const response = await axios.get('https://api.paystack.co/bank', {
            headers: {
                Authorization: `Bearer ${SECRET_KEY}`
            }
        });

        // Extract relevant bank data from the response
        const banks = response.data.data.map(bank => ({
            name: bank.name,
            code: bank.code
        }));

        // Save the bank data in your database
        await Bank.insertMany(banks);

        res.json({ success: true, message: 'Bank codes saved successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
};

exports.getAllBanks = async (req, res) => {
    try {
        const banks = await Bank.find({}, 'name code'); // Fetch only name and code fields
        res.json({ success: true, banks: banks });
    } catch (error) {
        console.error('Error fetching banks:', error);
        res.status(500).json({ success: false, error: 'Error fetching banks' });
    }
};

exports.createRecipient = async (req, res) => {
    try {
        const { accountNumber, bankName, name, description} = req.body;

        const {user} = req;
        console.log(user);

        // Find the bank by name
        const bank = await Bank.findOne({ name: bankName });

        if (!bank) {
            return res.status(400).json({ success: false, error: 'Invalid bank name' });
        }

        let accountValidationResponse;
        try {
            accountValidationResponse = await validateAccount(accountNumber, bank.code);
        } catch (error) {
            // Handle specific error messages from account validation
            if (error.message === 'Error validating account: Could not resolve account name. Check parameters or try again.') {
                return res.status(400).json({ success: false, error: error.message });
            } else {
                // Handle other errors
                throw error;
            }
        }

        if (!accountValidationResponse.status) {
            // Account validation failed
            return res.status(400).json({ success: false, error: accountValidationResponse.message });
        }

        // Create recipient with fetched bank code
        const response = await axios.post(
            'https://api.paystack.co/transferrecipient',
            {
                type: 'nuban',
                name: name,
                account_number: accountNumber,
                bank_code: bank.code, // Use fetched bank code
                description: description,

            },
            {
                headers: {
                    Authorization: `Bearer ${SECRET_KEY}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        // Save recipient to database
        const newRecipient = new Recipient({
            recipientCode: response.data.data.recipient_code,
            name: name,
            accountNumber: accountNumber,
            bankName: bankName,
            bankCode: bank.code, // Save bank code
            description: description,
            userId: user.id,
        });
        await newRecipient.save();

        res.json({ success: true, recipientCode: response.data.data.recipient_code, newRecipient:newRecipient });
    } catch (error) {
        console.error('Error creating recipient:', error);
        res.status(500).json({ success: false, error: 'Error creating recipient' });
    }
};

