// models/Slot.js

const mongoose = require('mongoose');

const slotSchema = new mongoose.Schema(
  {
    // Reference to the mentor (the owner of these slots)
    mentor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Date of the slot (stored in "dd-mm-yyyy" format)
    date: {
      type: String,
      required: true,
    },
    // The full time range string (e.g. "10:00 AM - 10:30 AM")
    time: {
      type: String,
      required: true,
    },
    // A display version of the slot (may be the same as time)
    display: {
      type: String,
      required: true,
    },
    // Start time (as string, e.g. "10:00")
    startTime: {
      type: String,
      required: true,
    },
    // End time (as string, e.g. "10:30")
    endTime: {
      type: String,
      required: true,
    },
    // Status of the slot
    // Possible values: "Open" (available), "Booked" (already reserved), "Archived" (no longer in use)
    status: {
      type: String,
      enum: ['Open', 'Booked', 'Archived'],
      default: 'Open',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Slot', slotSchema);