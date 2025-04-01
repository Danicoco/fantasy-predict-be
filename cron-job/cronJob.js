// const cron = require('node-cron');
// const axios = require('axios');
// const Fixture = require('../model/fpl/fixtures');
// const Pool = require('../model/pool/poolModel');
// const Club = require('../model/fpl/club');

// // Function to fetch and modify fixtures data
// async function fetchAndModifyFixtures() {
//     try {
//         // Fetch fixtures data from the external API
//         const response = await axios.get('https://fantasy.premierleague.com/api/fixtures/');
//         const fetchedFixtures = response.data;

//         // Modify response to replace team_a and team_h with club names
//         const modifiedFixtures = await Promise.all(fetchedFixtures.map(async fetchedFixture => {
//             try {
//                 const teamAData = await Club.findOne({ position: fetchedFixture.team_a });
//                 const teamHData = await Club.findOne({ position: fetchedFixture.team_h });

//                 if (!teamAData || !teamHData) {
//                     throw new Error('Club data not found for one or more teams.');
//                 }

//                 return {
//                     ...fetchedFixture,
//                     team_a: teamAData.name,
//                     team_h: teamHData.name
//                 };
//             } catch (error) {
//                 console.error('Error finding club data:', error.message);
//                 return null; // Return null for fixtures with missing club data
//             }
//         }));

//         // Filter out null values (fixtures with missing club data)
//         const validFixtures = modifiedFixtures.filter(fixture => fixture !== null);

//         // Update existing fixtures in the database without changing their IDs
//         await Promise.all(validFixtures.map(async fetchedFixture => {
//             try {
//                 const existingFixture = await Fixture.findOne({ id: fetchedFixture.id });

//                 if (existingFixture) {
//                     // Update existing fixture in the database
//                     await Fixture.findByIdAndUpdate(existingFixture._id, fetchedFixture);
//                 } else {
//                     // Create new fixture in the database
//                     await Fixture.create(fetchedFixture);
//                 }
//             } catch (error) {
//                 console.error('Error updating fixture:', error.message);
//             }
//         }));

//         console.log('Fixtures updated successfully.');
//     } catch (error) {
//         console.error('Error fetching and modifying fixtures:', error.message);
//     }
// }



// // Function to run the pool cron job
// async function runPoolCronJob() {
//     try {
//         // Find pools where selectedMatches are not yet finished
//         const pools = await Pool.find({ 'selectedMatches.finished': false });

//         // Iterate through each pool
//         for (const pool of pools) {
//             // Fetch details of each selected match from the fixtures database
//             const updatedSelectedMatches = await Promise.all(pool.selectedMatches.map(async selectedMatch => {
//                 // Fetch the corresponding fixture details
//                 const fixture = await Fixture.findById(selectedMatch.fixtureId);

//                 // Check if the fixture exists and if it's finished
//                 if (fixture && fixture.finished) {
//                     // If the fixture is finished, update the selected match's finished status
//                     selectedMatch.finished = true;

//                     // Update the selected match's team scores
//                     selectedMatch.team_a_score = fixture.team_a_score;
//                     selectedMatch.team_h_score = fixture.team_h_score;
//                 }

//                 return selectedMatch;
//             }));

//             // Update the pool with the updated selected matches
//             pool.selectedMatches = updatedSelectedMatches;

//             // Save the updated pool
//             await pool.save();
//         }

//         console.log('Selected matches updated successfully.');
//     } catch (error) {
//         console.error('Error updating selected matches:', error);
//     }
// }



// // Function to run the main cron job
// async function runCronJob() {
//     try {
//         const currentTime = new Date();
//         const tenMinutesLater = new Date(currentTime.getTime() + 10 * 60000);

//         // Find upcoming matches within the next 10 minutes
//         const upcomingMatches = await Fixture.find({
//             kickoff_time: { $gte: currentTime, $lte: tenMinutesLater }
//         });

//         // If there are upcoming matches, get the earliest kickoff time
//         if (upcomingMatches.length > 0) {
//             const earliestKickoffTime = upcomingMatches.reduce((earliest, match) => {
//                 return match.kickoff_time < earliest ? match.kickoff_time : earliest;
//             }, Infinity);

//             // Find pools with selected matches having kickoff time before the earliest kickoff time
//             const poolsToUpdate = await Pool.find({
//                 'selectedMatches.kickoff_time': { $lt: earliestKickoffTime }
//             });

//             // Update the 'open' field for the found pools to false
//             await Promise.all(poolsToUpdate.map(async pool => {
//                 pool.open = false;
//                 await pool.save();
//             }));

//             console.log('Pools updated successfully');
//         } else {
//             console.log('No upcoming matches within the next 10 minutes');
//         }
//     } catch (error) {
//         console.error('Error running cron job:', error);
//     }
// }

// cron.schedule('*/10 * * * *', async () => {
//     await fetchAndModifyFixtures();
// });

// // Schedule cron job to run pool cron job every 10 minutes
// cron.schedule('*/10 * * * *', async () => {
//     await runPoolCronJob();
// });
// // Function to run the job for allocating points
// const runJob = () => {
//     cron.schedule('*/10 * * * *', async () => { // Run every 30 minutes
//         try {
//             // Find pools with selected matches that have ended and run_once is false
//             const pools = await Pool.find({ 'selectedMatches.finished': true, 'selectedMatches.run_once': false });

//             // Iterate through each pool
//             for (const pool of pools) {
//                 // Make a POST request to the allocate-points endpoint
//                 await axios.post('http://localhost:6000/api/v1/pool/allocate-points');

//                 // Update run_once to true for each selected match in the pool
//                 pool.selectedMatches.forEach(match => {
//                     if (match.finished) {
//                         match.run_once = true;
//                     }
//                 });

//                 // Save the updated pool
//                 await pool.save();

//                 console.log('Cron job ran for points allocation successfully');
//             }
//         } catch (error) {
//             console.error('Error running cron job:', error);
//         }
//     });
// };

// // Function to check if all matches in selected matches are finished
// function areAllMatchesFinished(selectedMatches) {
//     return selectedMatches.every(match => match.finished === true);
// }

// // Function to run the distribute rewards cron job
// async function runDistributeRewardsCronJob() {
//     try {
//         // Find pools where all matches in selected matches are finished and distributed_reward is false
//         const poolsToUpdate = await Pool.find({
//             betEnabled: true,
//             'selectedMatches.finished': true,
//             distributed_reward: false
//         });

//         // Iterate through each pool
//         for (const pool of poolsToUpdate) {
//             // Check if all matches in selected matches are finished
//             if (areAllMatchesFinished(pool.selectedMatches)) {
//                 // Call the distributeRewards endpoint
//                 await axios.post(`http://localhost:6000/api/v1/pool/distribute-rewards/${pool._id}`);

//                 // Update distributed_reward to true for the pool
//                 pool.distributed_reward = true;
//                 await pool.save();

//                 console.log(`Rewards distributed for pool: ${pool._id}`);
//             }
//         }
//     } catch (error) {
//         console.error('Error running distribute rewards cron job:', error);
//     }
// }

// // Schedule cron job to run distribute rewards cron job every minute
// cron.schedule('* * * * *', async () => {
//     await runDistributeRewardsCronJob();
// });

// // Function to run the pool cron job
// async function runPoolSelectMatchCronJob() {
//     try {
//             // Find pools with selected matches that have started
//             const pools = await Pool.find({ 'selectedMatches.started': true });

//             // Iterate through each pool
//             for (const pool of pools) {
//                 // Update the pool's open field to false
//                 pool.open = false;
//                 await pool.save();
//                 console.log(`Pool ${pool._id} closed because a match has started.`);
//             }

//         console.log('Pool cron job for selected matches completed.');
//     } catch (error) {
//         console.error('Error running pool cron job:', error);
//     }
// }

// // Schedule cron job to run pool cron job every minute
// cron.schedule('* * * * *', async () => {
//     await runPoolSelectMatchCronJob();
// });

// module.exports = {
//     runCronJob,
//     fetchAndModifyFixtures,
//     runJob,
//     runPoolCronJob,
//     runDistributeRewardsCronJob,
//     runPoolSelectMatchCronJob
// };


// //using another value to be false and the cronjob to be true