exports.calculatePoints = (prediction, match) => {
    const { team_a_score: predictedTeamAScore, team_h_score: predictedTeamHScore } = prediction;
    const { team_a_score: actualTeamAScore, team_h_score: actualTeamHScore } = match;

    // Calculate the absolute difference between predicted and actual scores
    const differenceTeamAScore = Math.abs(predictedTeamAScore - actualTeamAScore);
    const differenceTeamHScore = Math.abs(predictedTeamHScore - actualTeamHScore);

    // If prediction is exact, return 5 points
    if (differenceTeamAScore === 0 && differenceTeamHScore === 0) {
        return 5;
    }

    // If prediction is close, return 3 points
    if (differenceTeamAScore <= 1 && differenceTeamHScore <= 1 || differenceTeamAScore !== 0 && differenceTeamHScore !== 2) {
        return 3;
    }
   // arsenal 4
   //  sheff 0
   //
   //  //prediction
   //  arsenal 1
   //  sheff 0

    // If prediction is wrong, return 0 points
    return 0;
};
