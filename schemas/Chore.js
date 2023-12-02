const mongoose = require("mongoose");

const choreSchema = new mongoose.Schema({
  name: String,
  timeEffortMinutes: Number,
  repeatFrequencyDays: Number,
  note: String,
  status: String,
  lastDone: Date,
  nextDue: Date,
});

module.exports = mongoose.model("Chore", choreSchema);
