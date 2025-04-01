// controllers/transactionController.js

const Transaction = require('../../model/transaction');



exports.getTransactionsForUser = async (req, res) => {
        try {
            const { userId } = req.params;
            const { startDate, endDate } = req.query; // Retrieve start and end dates from query parameters

            let query = { userId };

            // If both start date and end date are provided, add them to the query
            if (startDate && endDate) {
                // Adjust the date format to YYYY-MM-DDTHH:MM:SSZ for comparison with MongoDB date fields
                const startDateTime = `${startDate}T00:00:00Z`;
                const endDateTime = `${endDate}T23:59:59Z`;
                query.createdAt = { $gte: new Date(startDateTime), $lte: new Date(endDateTime) };
            }

            // Fetch transactions based on the query
            const transactions = await Transaction.find(query);

            // Initialize variables for calculating metrics
            let walletInflow = 0;
            let walletOutflow = 0;
            let totalInflow = 0;
            let totalOutflow = 0;

            // Loop through transactions to calculate inflow and outflow
            transactions.forEach((transaction) => {
                if (transaction.type === 'credit') {
                    walletInflow += transaction.amount;
                } else if (transaction.type === 'debit') {
                    walletOutflow += transaction.amount;
                }
            });

            // Calculate total inflow and outflow for the given date range
            transactions.forEach((transaction) => {
                if (transaction.type === 'credit') {
                    totalInflow += transaction.amount;
                } else if (transaction.type === 'debit') {
                    totalOutflow += transaction.amount;
                }
            });

            // Calculate percentage inflow and outflow
            const walletPercentageInflow = (walletInflow / (walletInflow + walletOutflow)) * 100;
            const walletPercentageOutflow = (walletOutflow / (walletInflow + walletOutflow)) * 100;

            // Calculate metrics by week, month, and year (not implemented here)

            // Prepare response object
            const response = {
                success: true,
                data: {
                    walletInflow,
                    walletPercentageInflow,
                    walletOutflow,
                    walletPercentageOutflow,
                    totalInflow,
                    totalOutflow
                }
            };

            res.status(200).json({ success: true, transactions, response });
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: 'Server Error' });
        }
    };




