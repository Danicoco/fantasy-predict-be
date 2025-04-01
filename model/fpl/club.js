const mongoose = require('mongoose');
const {Int32} = require("mongodb");

const clubSchema = new mongoose.Schema({
    name: String,
    imageUrl: String,
    position:{type: Number, index: true}
});

const Club = mongoose.model('Club', clubSchema);


module.exports = Club;
