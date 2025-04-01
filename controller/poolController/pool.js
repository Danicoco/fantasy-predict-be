const generateUniqueInvitationCode = require('../../middleware/poolMiddleware')
const User = require('../../model/user');

const Pool = require('../../model/pool/poolModel');
const Fixtures = require('../../model/fpl/fixtures');
const {calculatePoints} = require("../../utils/calcalatePoints");
const Wallet = require('../../model/wallet')
const {createTransaction} = require("../../utils/transaction");
const sendPushNotification = require("../../utils/firebase")

// exports.createPool = async (req, res) => {
//     const { name, visibility, betEnabled, stakeAmount, description } = req.body;
//     const user = req.user;
//
//     try {
//         let invitationCode = '';
//
//         if (visibility === 'private') {
//             // Generate invitation code for private pool
//             invitationCode = await generateUniqueInvitationCode();
//         }
//
//         // Create a new pool record for each pool the user wants to create
//         const newPoolData = {
//             visibility,
//             betEnabled,
//             name,
//             description,
//             creator: user.id,
//             numberOfUsers: 1, // Initialize the number of users as 1 when creating the pool
//             invitationCode, // Assign the invitation code to the invitationCode field
//         };
//
//         if (betEnabled) {
//             newPoolData.stakeAmount = stakeAmount;
//         }
//
//         const newPool = new Pool(newPoolData);
//
//         await newPool.save();
//
//         res.status(201).json({ success: true, pool: newPool });
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ success: false, message: 'Server Error' });
//     }
// };

exports.createPool = async (req, res) => {
    const { name, visibility, betEnabled, stakeAmount, description, totalBetAmount } = req.body;
    const userId = req.user.id;

    try {
        // Check if a pool with the same name exists for the user
        const existingPool = await Pool.findOne({ name, creator: userId });

        if (existingPool) {
            return res.status(400).json({ success: false, message: 'Pool name must be unique' });
        }

        let invitationCode;

        if (visibility === 'private' || visibility === 'public') {
            // Generate unique invitation code for private pool
            invitationCode = await generateUniqueInvitationCode();
        }

        // Fetch the user from the database to get the FCM token
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const fcmTokens = user.fcmTokens;

        console.log(fcmTokens)

        // Create a new pool record
        const newPoolData = {
            visibility,
            betEnabled,
            name,
            description,
            creator: userId,
            numberOfUsers: 1, // Initialize the number of users as 1 when creating the pool
            invitationCode, // Assign the invitation code to the invitationCode field
            totalBetAmount
        };

        if (betEnabled) {
            newPoolData.stakeAmount = stakeAmount;
        }

        // Create a new pool instance
        const newPool = new Pool(newPoolData);

        // Add the creator as a participant
        newPool.participants.push({ userId });

        // Deduct the stake amount from the creator's wallet balance
        if (betEnabled) {
            const creatorWallet = await Wallet.findOne({ userId });
            if (!creatorWallet || creatorWallet.balance < stakeAmount) {
                return res.status(403).json({ success: false, message: 'Insufficient balance' });
            }
            creatorWallet.balance -= stakeAmount;
            await creatorWallet.save();

            // Create transactionController record for the stake amount deduction
            await createTransaction(userId, 'debit', stakeAmount, 'Stake amount deduction for pool creation');



        // Add the stake amount to the totalBetAmount of the pool
            newPool.totalBetAmount += stakeAmount;
        }

        // Save the new pool record
        await newPool.save();

        res.status(201).json({ success: true, pool: newPool });

        if (betEnabled) {
            const notificationData = {
                title: "Pool Created!",
                body: `${stakeAmount} deducted for your pool "${name}".`
            };
            // Send notification to each FCM token in the array
            for (const token of fcmTokens) {
                await sendPushNotification({ ...notificationData, token });
            }
        } else {
            const notificationData = {
                title: "Pool Created!",
                body: `Your pool "${name}" is live! (no bets)`
            };
            // Send notification to each FCM token in the array
            for (const token of fcmTokens) {
                await sendPushNotification({ ...notificationData, token });
            }
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};




exports.joinPool = async (req, res) => {
    try {
        const { poolId } = req.params;
        const { name, invitationCode, stakeAmount, betEnabled, totalBetAmount } = req.body;
        const userId = req.user.id;
        console.log(userId);
        // Fetch the user's wallet balance
        const userWallet = await Wallet.findOne({ userId});
        if (!userWallet) {
            return res.status(404).json({ message: 'Wallet not found' });
        }

        // Check if the user has sufficient balance
        if (userWallet.balance < stakeAmount) {
            return res.status(403).json({ message: 'Insufficient balance' });
        }

        // Deduct the stake amount from the user's wallet balance
        userWallet.balance -= stakeAmount;
        await userWallet.save();

        // Create transactionController record for the stake amount deduction
        await createTransaction(userId, 'debit', stakeAmount, 'Stake amount deduction for joining pool');



        // Fetch the pool details from the database
        const pool = await Pool.findById(poolId);
        if (!pool) {
            return res.status(404).json({ message: 'Pool not found' });
        }

        // Check if the pool is open for joining
        if (!pool.open) {
            return res.status(403).json({ message: 'Pool is closed for joining' });
        }

        // Check if the user is the creator of the pool
        if (pool.creator.toString() === userId.toString()) {
            return res.status(403).json({ message: 'The creator cannot join the pool' });
        }

        // Check if the pool is private and if the invitation code matches
        if (pool.visibility === 'private' && pool.invitationCode !== invitationCode) {
            return res.status(403).json({ message: 'Invalid invitation code' });
        }

        // Fetch the user from the database to get the FCM token
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const fcmTokens = user.fcmTokens;


        // Add the user to the pool's participants list
        pool.participants.push({ userId });

        // Increment the number of users in the pool
        pool.numberOfUsers++;


        // Update the total bet amount in the pool
        pool.totalBetAmount += stakeAmount;

        // Save the updated pool
        await pool.save();

        // Send notification to pool creator about new participant
        const notificationData = {
            title: "New Participant Joined!",
            body: `User ${userId} joined your pool "${pool.name}"`,
        };
            // Send notification to each FCM token in the array
            for (const token of fcmTokens) {
                await sendPushNotification({ ...notificationData, token });
            }
        await sendPushNotification(notificationData);

        // If bet is enabled, send notification about stake amount deduction
        if (betEnabled) {
            const notificationData = {
                title: "Stake Amount Deducted",
                body: `Stake amount ${stakeAmount} deducted for joining pool "${pool.name}"`,
            };
            // Send notification to each FCM token in the array
            for (const token of fcmTokens) {
                await sendPushNotification({ ...notificationData, token });
            }
            await sendPushNotification(notificationData);
        }

        // Return the updated pool as a response
        return res.status(200).json({ message: 'Joined pool successfully', pool });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}


exports.getAllPools = async (req, res) => {
    try {
        // Find all pools with visibility either 'public' or 'private'
        const pools = await Pool.find({ visibility: { $in: ['public', 'private'] } });


        res.status(200).json({ success: true, pools });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

exports.getAllPrivatePools = async (req, res) => {
    try {
        // Find all pools with visibility either 'public' or 'private'
        const pools = await Pool.find({ visibility:  'private'  });

        res.status(200).json({ success: true, pools });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

exports.getAllPublicPools = async (req, res) => {
    try {
        // Find all pools with visibility either 'public' or 'private'
        const pools = await Pool.find({ visibility:  'public'  });

        res.status(200).json({ success: true, pools });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};


exports.getAllPoolsByUser = async (req, res) => {
    try {
        const userId = req.params.userId;

        // Query the database to retrieve all pools created by the specified user
        const userPools = await Pool.find({ creator: userId });

        // Return the list of pools as a response
        res.status(200).json({ success: true, pools: userPools });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

exports.getPoolById = async (req, res) => {
    const poolId = req.params.poolId;

    try {

        // Query the database to retrieve the pool by ID
        const pool = await Pool.findById(poolId);

        if (!pool) {
            // If pool is not found, return 404 Not Found
            res.status(404).json({ success: false, message: 'Pool not found' });
            return;
        }

        // Return the pool as a response
        res.status(200).json({ success: true, pool });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

exports.selectedMatches = async (req, res) => {
    const { poolId } = req.params;
    const { selectedMatches } = req.body; // Assuming selectedMatches is an array of selected match IDs
    const creatorId = req.user.id; // Assuming you have user information stored in req.user

    try {
        // Fetch the pool from the database
        let pool = await Pool.findById(poolId);

        // Check if the pool exists
        if (!pool) {
            return res.status(404).json({ success: false, message: 'Pool not found' });
        }

        // Check if the user is the creator of the pool
        if (pool.creator.toString() !== creatorId) {
            return res.status(403).json({ success: false, message: 'You are not authorized to perform this action' });
        }

        // Initialize an empty array to store the details of selected matches
        const selectedMatchesDetails = [];

        // Iterate through selectedMatches and fetch fixture details
        for (const match of selectedMatches) {
            // Fetch the fixture details
            const fixture = await Fixtures.findById(match.fixtureId);

            // Check if the fixture is not finished and exists
            if (fixture && !fixture.finished) {
                selectedMatchesDetails.push({
                    fixtureId: fixture._id,
                    started: fixture.started,
                    kickoff_time: fixture.kickoff_time,
                    finished: fixture.finished,
                    team_a: fixture.team_a,
                    team_h: fixture.team_h,
                    team_a_score: fixture.team_a_score,
                    team_h_score: fixture.team_h_score,
                    team_a_imageUrl: fixture.team_a_imageUrl, // Include team_a_imageUrl
                    team_h_imageUrl: fixture.team_h_imageUrl, // Include team_h_imageUrl
                });
            } else {
                // If the fixture is finished or does not exist, add an error message to the response
                selectedMatchesDetails.push({ fixtureId: match.fixtureId, error: 'Fixture has already finished or does not exist' });
            }
        }

        // Update the pool with the selected matches and their details
        pool.selectedMatches.push(...selectedMatchesDetails);
        await pool.save();

        res.status(200).json({ success: true, message: 'Selected matches updated successfully', selectedMatchesDetails });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};





// exports.selectedMatches = async (req, res) => {
//     const { poolId } = req.params;
//     const { selectedMatches } = req.body; // Assuming selectedMatches is an array of selected match IDs
//     const creatorId = req.user.id; // Assuming you have user information stored in req.user
//
//         try {
//             // Fetch the pool from the database
//             let pool = await Pool.findById(poolId);
//
//             // Check if the pool exists
//             if (!pool) {
//                 return res.status(404).json({ success: false, message: 'Pool not found' });
//             }
//
//             // Check if the user is the creator of the pool
//             if (pool.creator.toString() !== creatorId) {
//                 return res.status(403).json({ success: false, message: 'You are not authorized to perform this action' });
//             }
//
//             // Fetch details of each selected match from the fixtures database
//             const selectedMatchesDetails = await Promise.all(selectedMatches.map(async match => {
//                 const fixture = await Fixtures.findById(match.fixtureId);
//               //  console.log(fixture);
//                 return {
//                     fixtureId: fixture._id,
//                     kickoff_time: fixture.kickoff_time,
//                     finished: fixture.finished,
//                     team_a: fixture.team_a,
//                     team_h: fixture.team_h,
//                     team_a_score: fixture.team_a_score,
//                     team_h_score: fixture.team_h_score,
//
//                 };
//             }));
//
//
//             // Update the pool with the selected matches and their details
//             pool.selectedMatches = selectedMatchesDetails;
//             console.log(selectedMatchesDetails)
//             await pool.save();
//
//             res.status(200).json({ success: true, message: 'Selected matches updated successfully', selectedMatchesDetails: selectedMatchesDetails });
//         } catch (error) {
//             console.error(error);
//             res.status(500).json({success: false, message: 'Server Error'});
//         }
// };


// exports.predictions = async (req, res) => {
//     const { poolId } = req.params;
//     const { userId, predictions } = req.body;
//     console.log(userId);
//     console.log(predictions);
//     try {
//         // Find the pool by ID
//         const pool = await Pool.findById(poolId);
//
//         if (!pool) {
//             return res.status(404).json({ success: false, message: 'Pool not found' });
//         }
//
//         // Find the user in the participants array
//         let participant = pool.participants.find(participant => participant.userId.toString() === userId);
//
//         // If the participant is not found, check if the user is the creator
//         if (!participant) {
//             if (pool.creator.toString() === userId) {
//                 // If the user is the creator, add them as a participant
//                 participant = {
//                     userId: userId,
//                     predictions: [predictions]
//                 };
//
//                 pool.participants.push(participant);
//             } else {
//                 return res.status(404).json({ success: false, message: 'User not found in the pool' });
//             }
//         }
//
//         // Update the participant's predictions
//         participant.predictions = predictions;
//
//         // Calculate points for the predictions and update participant.points
//
//         // Save the updated pool
//         await pool.save();
//
//         res.status(200).json({ success: true, message: 'Predictions saved successfully' , predictions:predictions});
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ success: false, message: 'Server Error' });
//     }
// };


// exports.predictions = async (req, res) => {
//     const { poolId } = req.params;
//     const { userId, fixtureId, team_h_score, team_a_score, team_h, team_a } = req.body;
//
//     try {
//         // Find the pool by ID
//         const pool = await Pool.findById(poolId);
//
//         if (!pool) {
//             return res.status(404).json({ success: false, message: 'Pool not found' });
//         }
//
//         // Find the user in the participants array
//         let participant = pool.participants.find(participant => participant.userId.toString() === userId);
//
//         // If the participant is not found, check if the user is the creator
//         if (!participant) {
//             if (pool.creator.toString() === userId) {
//                 // If the user is the creator, add them as a participant
//                 participant = {
//                     userId: userId,
//                     predictions: [{ fixtureId, team_h, team_h_score, team_a, team_a_score, }]
//                 };
//                 pool.participants.push(participant);
//             } else {
//                 return res.status(404).json({ success: false, message: 'User not found in the pool' });
//             }
//         } else {
//             // Update or add the participant's predictions for the specified fixture
//             const existingPrediction = participant.predictions.find(prediction => prediction.fixtureId.toString() === fixtureId);
//             if (existingPrediction) {
//                 // Update existing prediction
//                 existingPrediction.team_h_score = team_h_score;
//                 existingPrediction.team_a_score = team_a_score;
//             } else {
//                 // Add new prediction
//                 participant.predictions.push({ fixtureId, team_h_score, team_a_score });
//             }
//
//             console.log(participant.predictions)
//         }
//
//         // Save the updated pool
//         await pool.save();
//
//         // Return the updated predictions
//         res.status(200).json({ success: true, message: 'Predictions saved successfully', participant:participant });
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ success: false, message: 'Server Error' });
//     }
// };

exports.predictions = async (req, res) => {
    const { poolId } = req.params;
    const { userId, fixtureId, team_h_score, team_a_score, team_h, team_a } = req.body;

    try {
        // Find the pool by ID
        const pool = await Pool.findById(poolId);

        if (!pool) {
            return res.status(404).json({ success: false, message: 'Pool not found' });
        }

        // Find the user in the participants array
        let participant = pool.participants.find(participant => participant.userId.toString() === userId);

        // If the participant is not found, check if the user is the creator
        if (!participant) {
            if (pool.creator.toString() === userId) {
                // If the user is the creator, add them as a participant
                participant = {
                    userId: userId,
                    predictions: [{ fixtureId, team_h, team_h_score, team_a, team_a_score, }]
                };
                pool.participants.push(participant);
            } else {
                return res.status(404).json({ success: false, message: 'User not found in the pool' });
            }
        } else {
            // Check if the user has already submitted a prediction for the specified fixture
            const existingPredictionIndex = participant.predictions.findIndex(prediction => prediction.fixtureId.toString() === fixtureId);
            if (existingPredictionIndex !== -1) {
                return res.status(400).json({ success: false, message: 'Prediction for this fixture already submitted' });
            }

            // Add new prediction
            participant.predictions.push({ fixtureId, team_h_score, team_a_score });
        }

        // Save the updated pool
        await pool.save();

        // Return the updated predictions
        res.status(200).json({ success: true, message: 'Prediction saved successfully', participant });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};


exports.getPredictions = async (req, res) => {
    const { poolId, userId } = req.params;

    try {
        // Find the pool by ID
        const pool = await Pool.findById(poolId).populate({
            path: 'participants.predictions.fixtureId',
            select: '-team_a_score -team_h_score',
            model: 'Fixtures' // Assuming the name of the model is 'Fixture'
        });

        if (!pool) {
            return res.status(404).json({ success: false, message: 'Pool not found' });
        }

        // Find the user in the participants array
        const participant = pool.participants.find(participant => participant.userId.toString() === userId);

        if (!participant) {
            return res.status(404).json({ success: false, message: 'User not found in the pool' });
        }

        // Return the predictions for the user along with fixture details
        res.status(200).json({ success: true, predictions: participant.predictions });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};



exports.allocatePoints = async (req, res) => {

    try {
        // Find pools with selected matches that have ended
        const pools = await Pool.find({ 'selectedMatches.finished': true });

        // Iterate through each pool
        for (const pool of pools) {
            // Iterate through participants of the pool
            for (const participant of pool.participants) {
                // Iterate through selected matches of the pool
                for (const match of pool.selectedMatches) {
                    if (match.finished) {
                        // Find the prediction for the ended match
                        const prediction = participant.predictions.find(pred => pred.fixtureId.toString() === match.fixtureId.toString());

                        if (prediction) {
                            // Calculate points based on the prediction and match outcome
                            const points = calculatePoints(prediction, match);
                            participant.points += points;
                        }
                    }
                }
            }

            // Save the updated pool
            await pool.save();
        }

        // Respond with success message
        res.status(200).json({ success: true, message: 'Points allocated successfully' });
    } catch (error) {
        console.error('Error allocating points:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }

}


exports.getPoolUsersByPoints = async (req, res) => {
    try {
        const { poolId } = req.params;

        // Fetch the pool from the database
        const pool = await Pool.findById(poolId);

        if (!pool) {
            return res.status(404).json({ success: false, message: 'Pool not found' });
        }

        // Sort participants by points in descending order
        const sortedUsers = pool.participants.sort((a, b) => b.points - a.points);

        res.status(200).json({ success: true, users: sortedUsers });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

exports.distributeRewards = async (req, res) => {
    try {
        const { poolId } = req.params;

        // Fetch the pool from the database
        const pool = await Pool.findById(poolId);

        if (!pool) {
            return res.status(404).json({ success: false, message: 'Pool not found' });
        }

        // Fetch the user from the database to get the FCM token
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const fcmTokens = user.fcmTokens;

        // Calculate 90% of the total bet amount
        const totalBetAmount = pool.totalBetAmount;
        const rewardAmount = totalBetAmount * 0.9;

        // Fetch participants of the pool sorted by points in descending order
        const sortedUsers = pool.participants.sort((a, b) => b.points - a.points);

        // Calculate rewards for users with the highest points
        let totalRewardsDistributed = 0;
        let numberOfUsersWithHighestPoints = 0;
        let highestPoints = 0;

// Find the highest points
        for (const user of sortedUsers) {
            if (user.points > highestPoints) {
                highestPoints = user.points;
            }
        }

// Calculate the number of users with the highest points
        for (const user of sortedUsers) {
            if (user.points === highestPoints) {
                numberOfUsersWithHighestPoints++;
            }
        }

// Distribute rewards among users with the highest points
        for (const user of sortedUsers) {
            if (user.points === highestPoints) {
                const userObj = await User.findById(user.userId);
                const userWallet = await Wallet.findOne({ userId: user.userId });

                // Calculate the reward for the user
                const userReward = (0.9 * totalBetAmount) / numberOfUsersWithHighestPoints; // 90% of total bet amount divided equally among users with the highest points
                totalRewardsDistributed += userReward;

                // Update user's balance with the reward
                userWallet.balance += userReward;
                await userWallet.save();

                // Create transactionController record for the stake amount deduction
                await createTransaction(req.user.id, 'credit', userReward, 'Reward distributed for winning bet in pool ${poolId}');

                // Send notification to the user about winning the bet and the amount won
                const notificationData = {
                    title: "Congratulations! You Won!",
                    body: `You won ${userReward} for winning the bet in pool "${pool.name}"`,
                };
                // Send notification to each FCM token in the array
                for (const token of fcmTokens) {
                    await sendPushNotification({ ...notificationData, token });
                }
                await sendPushNotification(notificationData);
            }

        }

        // Distribute 10% of the total bet amount to the company wallet
        const companyReward = 0.1 * totalBetAmount;
        const companyWallet = await Wallet.findOne({ userId: '65d3141d97c3951f7b83ba03' }); // Adjust the userId as per your company wallet's userId
        companyWallet.balance += companyReward;
        await companyWallet.save();

        // Deduct the total bet amount from the pool's total bet amount
        pool.totalBetAmount -= totalBetAmount;
        await pool.save();

        res.status(200).json({ success: true, message: 'Rewards distributed successfully', totalRewardsDistributed });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};


exports.getMatchResults = async (req, res) => {
    try {
        const poolId = req.params.poolId; // Assuming you pass the pool ID in the URL parameter
        const pool = await Pool.findById(poolId);

        if (!pool) {
            return res.status(404).json({ error: 'Pool not found' });
        }

        const selectedMatches = pool.selectedMatches;

        if (!selectedMatches || selectedMatches.length === 0) {
            return res.status(404).json({ error: 'No selected matches found in the pool' });
        }

        // Map through the selectedMatches array to create an array of match details
        const matchResults = selectedMatches.map(match => ({
            fixtureId: match.fixtureId,
            team_a: match.team_a,
            team_h: match.team_h,
            team_a_score: match.team_a_score,
            team_h_score: match.team_h_score,
            team_a_imageUrl: match.team_a_imageUrl,
            team_h_imageUrl: match.team_h_imageUrl
        }));

        res.json(matchResults);
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

exports.getActivePoolsForUser = async (req, res) => {
    const userId = req.params.userId;

    try {
        // Query the database to find active pools where the user is a participant
        const activePools = await Pool.find(
        {
            participants: { $elemMatch: { userId: userId } },
            open: true
        },
        // Exclude the participants and selectedMatches fields from the query projection
        { participants: 0, selectedMatches: 0 }
    );


        // Return the active pools as a response
        res.status(200).json({ success: true, activePools });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

