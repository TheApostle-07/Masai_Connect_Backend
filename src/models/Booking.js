const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    mentor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    sessionType: {
      type: String,
      required: true,
      // e.g., "Mentor Connect", "IA Connect", etc.
    },
    mode: {
      type: String,
      enum: ['Private', 'Public'],
      required: true,
    },
    slot: {
      date: {
        // Expected format: "dd-mm-yyyy"
        type: String,
        required: true,
      },
      time: {
        // Expected format: "HH:MM AM/PM - HH:MM AM/PM"
        type: String,
        required: true,
      },
      slotId: {
        type: String,
        required: true,
      },
    },
    agenda: {
      type: String,
      default: '',
    },
    zoomMeetingId: {
      type: String,
    },
    zoomJoinUrl: {
      type: String,
    },
    zoomStartUrl: {
      type: String,
    },
    status: {
      type: String,
      enum: [
        'Booked',
        'In Progress',
        'Completed',
        'Cancellation Requested',
        'Reschedule Requested',
        'Cancelled',
        'Rescheduled',
      ],
      default: 'Booked',
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
  }
);

module.exports = mongoose.model('Booking', bookingSchema);
