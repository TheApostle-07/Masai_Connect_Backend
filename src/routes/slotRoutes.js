// routes/slotRoutes.js

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Slot = require('../models/Slot');

// GET /api/slots?mentor=<mentorId>&status=<optionalStatus>
// Retrieves slots, optionally filtered by mentor (required) and/or by status.
router.get('/slots', async (req, res) => {
  try {
    const { mentor, status } = req.query;
    let filter = {};

    if (mentor) {
      if (!mongoose.Types.ObjectId.isValid(mentor)) {
        return res.status(400).json({ error: 'Invalid mentor id.' });
      }
      filter.mentor = mentor;
    }

    if (status) {
      filter.status = status;
    }

    const slots = await Slot.find(filter).sort({ date: 1, startTime: 1 });
    res.json(slots);
  } catch (error) {
    console.error('Error fetching slots:', error);
    res.status(500).json({ error: 'Failed to fetch slots.' });
  }
});

// POST /api/slots
// Creates new slot(s). You can send a single slot object or an array of slot objects.
// The slot object should include at least: mentor, date, time, display, startTime, endTime.
router.post('/slots', async (req, res) => {
  try {
    const data = req.body;
    let createdSlots;
    if (Array.isArray(data)) {
      createdSlots = await Slot.insertMany(data);
    } else {
      const slot = new Slot(data);
      createdSlots = await slot.save();
    }
    res.status(201).json(createdSlots);
  } catch (error) {
    console.error('Error creating slot(s):', error);
    res.status(500).json({ error: 'Failed to create slot(s).' });
  }
});

// PUT /api/slots/:id
// Updates an existing slot (for editing details or changing status).
router.put('/slots/:id', async (req, res) => {
  try {
    const slotId = req.params.id;
    const updateData = req.body;
    const updatedSlot = await Slot.findByIdAndUpdate(slotId, updateData, { new: true });
    if (!updatedSlot) {
      return res.status(404).json({ error: 'Slot not found.' });
    }
    res.json(updatedSlot);
  } catch (error) {
    console.error('Error updating slot:', error);
    res.status(500).json({ error: 'Failed to update slot.' });
  }
});

// DELETE /api/slots/:id
// Deletes a slot.
router.delete('/slots/:id', async (req, res) => {
  try {
    const slotId = req.params.id;
    const deletedSlot = await Slot.findByIdAndDelete(slotId);
    if (!deletedSlot) {
      return res.status(404).json({ error: 'Slot not found.' });
    }
    res.json({ message: 'Slot deleted successfully.' });
  } catch (error) {
    console.error('Error deleting slot:', error);
    res.status(500).json({ error: 'Failed to delete slot.' });
  }
});

module.exports = router;