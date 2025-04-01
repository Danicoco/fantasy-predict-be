const Club = require('../../model/fpl/club');
const Fixtures = require('../../model/fpl/fixtures');
const axios = require('axios');
const moment = require('moment');
const { startOfWeek, endOfWeek, getWeek } = require('date-fns');

exports.createClub = async (req, res) => {
  try {
    const { name, imageUrl } = req.body;
    const newData = await Club.create({ name, imageUrl });
    res.status(201).json(newData);
  } catch (error) {
    console.error('Error creating data:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.getAllClubs = async (req, res) => {
  try {
    const clubs = await Club.find();
    res.json(clubs);
  } catch (error) {
    console.error('Error fetching clubs:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.fetchAndModifyFixtures = async (req, res) => {
  try {
    // Fetch fixtures data from the endpoint
    const response = await axios.get('https://fantasy.premierleague.com/api/fixtures/');
    const fixtures = response.data;

    // Modify response
    const modifiedFixtures = await Promise.all(fixtures.map(async fixture => {
      const teamAData = await Club.findOne({position: fixture.team_a});
      const teamHData = await Club.findOne({position: fixture.team_h});

      return {
        ...fixture,
        team_a: teamAData.name,
        team_h: teamHData.name,
        team_a_imageUrl: teamAData.imageUrl,
        team_h_imageUrl: teamHData.imageUrl
      };
    }));

    // Save modified fixtures data in the Fixtures collection
    //await Fixtures.insertMany(modifiedFixtures);

    console.log('Modified fixtures:', modifiedFixtures);

    // Send modified fixtures as a response to Postman
    res.status(200).json({ modifiedFixtures });
  } catch (error) {
    console.error('Error fetching and modifying fixtures:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

exports.fetchAndModifyFixturesByGameWeek = async (req, res) => {
  try {
    // Get event ID from request query or use a default value
    const eventId = req.query.event || 1;

    // Fetch fixtures data for the specified event from the endpoint
    const response = await axios.get(`https://fantasy.premierleague.com/api/fixtures/?event=${eventId}`);
    const fixtures = response.data;

    // Modify response
    const modifiedFixtures = await Promise.all(fixtures.map(async fixture => {
      const teamAData = await Club.findOne({position: fixture.team_a});
      const teamHData = await Club.findOne({position: fixture.team_h});

      return {
        ...fixture,
        team_a: teamAData.name,
        team_h: teamHData.name,
        team_a_imageUrl: teamAData.imageUrl,
        team_h_imageUrl: teamHData.imageUrl
      };
    }));

    // Save modified data to the database
    // Insert your database saving logic here

    console.log('Modified fixtures:', modifiedFixtures);

    // Send modified fixtures as a response to Postman
    res.status(200).json({ modifiedFixtures });
  } catch (error) {
    console.error('Error fetching and modifying fixtures:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

exports.getMatchesByKickoffTime = async (req, res) => {
  try {
    const { kickoffTime } = req.params;

    // Extract the date part from the provided kickoffTime
    const date = moment(kickoffTime).format('YYYY-MM-DD');

    // Retrieve modified fixtures data from the database based on the date
    const modifiedFixtures = await Fixtures.find({
      kickoff_time: { $gte: new Date(date), $lt: new Date(date + 'T23:59:59.999Z') }
    });

    // Return the matches for the specified date
    res.status(200).json({ matches: modifiedFixtures });
  } catch (error) {
    console.error('Error getting matches by kickoff time:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.getMatchesById = async (req, res) => {
  try {
    const { id } = req.params;

    // Retrieve modified fixtures data from the database based on the ID
    const fixture = await Fixtures.findById(id);

    // Check if fixture with the provided ID exists
    if (!fixture) {
      return res.status(404).json({ error: 'Fixture not found' });
    }

    // Return the matches for the specified ID
    res.status(200).json({ matches: fixture });
  } catch (error) {
    console.error('Error getting matches by ID:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.getAllFixtures = async (req, res) => {
  try {
    // Fetch all fixtures from the database
    const fixtures = await Fixtures.find();

    res.status(200).json({ success: true, fixtures });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};



exports.getFixturesByEvent = async (req, res) => {
  try {
    const { event } = req.params;
    // Fetch fixtures from the database for the specified event
    const fixtures = await Fixtures.find({ event });

    res.status(200).json({ success: true, fixtures });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.getCurrentWeekEvent = async (req, res) => {
  try {
    // Get the current date
    const currentDate = new Date();

    // Calculate the start and end of the current week
    const startOfCurrentWeek = startOfWeek(currentDate, { weekStartsOn: 1 }); // Assuming week starts on Monday
    const endOfCurrentWeek = endOfWeek(currentDate, { weekStartsOn: 1 }); // Assuming week starts on Monday

    // Fetch fixtures for the current week
    const fixtures = await Fixtures.find({
      kickoff_time: { $gte: startOfCurrentWeek, $lte: endOfCurrentWeek }
    });

    // Determine the event of the current week
    let currentWeekEvent = null;
    if (fixtures.length > 0) {
      // Get the event number of the latest fixture in the current week
      currentWeekEvent = fixtures.reduce((maxEvent, fixture) => {
        return fixture.event > maxEvent ? fixture.event : maxEvent;
      }, 0);
    }

    res.status(200).json({ success: true, currentWeekEvent });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.getCurrentFixtures = async (req, res) => {
  try {
    const currentDate = new Date();
    const startOfDay = new Date(currentDate);
    startOfDay.setHours(0, 0, 0, 0); // Set time to the start of the day (00:00:00)

    const endOfDay = new Date(currentDate);
    endOfDay.setHours(23, 59, 59, 999); // Set time to the end of the day (23:59:59:999)

    // Fetch current fixtures (fixtures with kickoff time today)
    const currentFixtures = await Fixtures.find({
      kickoff_time: { $gte: startOfDay, $lte: endOfDay }
    });

    res.status(200).json({ success: true, currentFixtures });
  } catch (error) {
    console.error('Error fetching current fixtures:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};


exports.getUpcomingFixtures = async (req, res) => {
  try {
    const currentDate = new Date();
    const timeZoneOffset = currentDate.getTimezoneOffset() * 60000; // Convert minutes to milliseconds
    const currentDateTimezone = new Date(currentDate.getTime() - timeZoneOffset); // Adjust for timezone offset

    // Set the start time to the beginning of the next day
    const startOfNextDay = new Date(currentDateTimezone);
    startOfNextDay.setDate(startOfNextDay.getDate() + 1);
    startOfNextDay.setHours(0, 0, 0, 0);

    const { page = 1, pageSize = 10 } = req.query;
    const skip = (page - 1) * pageSize;

    // Fetch upcoming fixtures (fixtures with kickoff time after the current date), paginated
    const upcomingFixtures = await Fixtures.find({ kickoff_time: { $gte: startOfNextDay } })
        .sort({ kickoff_time: 1 })
        .skip(skip)
        .limit(pageSize);

    res.status(200).json({ success: true, upcomingFixtures });
  } catch (error) {
    console.error('Error fetching upcoming fixtures:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};





exports.getLiveOrEndedFixtures = async (req, res) => {
  try {
    // Fetch fixtures from the database
    const fixtures = await Fixtures.find();

    // Filter live or just ended fixtures
    const liveFixtures = [];
    const justEndedFixtures = [];

    const currentTime = new Date();

    fixtures.forEach(fixture => {
      const kickoffTime = new Date(fixture.kickoff_time);

      if (fixture.started && !fixture.finished) {
        // Match is live
        liveFixtures.push(fixture);
      } else if (fixture.finished) {
        // Calculate the end time of the match (kickoff time + 120 minutes)
        const matchEndTime = new Date(kickoffTime.getTime() + (120 * 60000)); // Adding 120 minutes in milliseconds

        // Check if the current time is within 120 minutes after the kickoff time
        if (currentTime <= matchEndTime) {
          justEndedFixtures.push(fixture);
        }
      }
    });

    if (liveFixtures.length === 0 && justEndedFixtures.length === 0) {
      return res.status(200).json({ success: true, message: 'No live or just ended fixtures yet.' });
    }

    res.status(200).json({ success: true, liveFixtures, justEndedFixtures });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};


