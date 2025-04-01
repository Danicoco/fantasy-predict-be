const axios = require('axios');

exports.fetchCurrentWeekData = async () => {
    try {
        const response = await axios.get("https://fantasy.premierleague.com/api/bootstrap-static/");
        const result = response.data;
        let currentWeek = 1;
        result.events.forEach(element => {
            if (element.finished === true) {
                currentWeek = element.id;
            }
        });
        return currentWeek;
    } catch (error) {
        throw error;
    }
};



