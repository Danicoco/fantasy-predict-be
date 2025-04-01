const mongoose = require('mongoose');

const fixtureSchema = new mongoose.Schema({
    code: {
        type: Number,

    },
    event: {
        type: Number,
    },
    finished: {
        type: Boolean,

    },
    finished_provisional: {
        type: Boolean,

    },
    id: {
        type: Number,
        required: true
    },
    kickoff_time: {
        type: Date,
        index: true
    },
    minutes: {
        type: Number,

    },
    provisional_start_time: {
        type: Boolean,
    },
    started: {
        type: Boolean,
    },
    team_a: {
        type: String,

    },
    team_a_score: {
        type: Number,

    },
    team_h: {
        type: String,

    },
    team_h_score: {
        type: Number,

    },
    team_a_imageUrl: {
        type: String

    },
    team_h_imageUrl: {
        type: String

    }
});

const Fixtures = mongoose.model('Fixtures', fixtureSchema);

module.exports = Fixtures;
