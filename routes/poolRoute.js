

const express = require('express');
const router = express.Router();
const poolController = require('../controller/poolController/pool');
const poolControllerV2 = require('../controller/poolController/v2');
const verify = require('../middleware/authMiddleWare');


router.post('/', poolControllerV2.create);
router.patch('/:_id/join', poolControllerV2.join);
router.patch('/invite', poolControllerV2.joinPrivate);
router.get('/:_id/members', poolControllerV2.members);
router.get('/', poolControllerV2.fetch);



router.post('/create_pool',verify, poolController.createPool);
router.get('/get_pool',verify, poolController.getAllPools);
router.get('/get_private_pool',verify, poolController.getAllPrivatePools);
router.get('/get_public_pool',verify, poolController.getAllPublicPools);
router.get('/get_all_user_pool/:userId',verify, poolController.getAllPoolsByUser);
router.get('/get_by_pool_Id/:poolId',verify, poolController.getPoolById);
router.post('/join_pool/:poolId',verify, poolController.joinPool);
router.post('/choose_match/:poolId',verify, poolController.selectedMatches);
router.post('/prediction/:poolId',verify, poolController.predictions);
router.get('/get_users_pool/:poolId',verify, poolController.getPoolUsersByPoints);
router.get('/get_match_result/:poolId',verify, poolController.getMatchResults);
router.get('/get_active_pools/:userId',verify, poolController.getActivePoolsForUser);
router.get('/get_predictions/:poolId/user/:userId',verify, poolController.getPredictions);
router.post('/distribute-rewards/:poolId', poolController.distributeRewards);
router.post('/allocate-points', poolController.allocatePoints);

module.exports = router;
