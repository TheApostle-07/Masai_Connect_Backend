const express = require('express');
const router = express.Router();
const User = require('../models/user.model'); // Adjust the path as needed

/**
 * GET /api/users
 * Retrieves the list of users.
 * If an 'ids' query parameter is provided (comma-separated list), only those users are returned.
 */
router.get('/users', async (req, res) => {
  try {
    let query = {};
    const { ids } = req.query;
    if (ids) {
      // Split the comma-separated list and trim each ID.
      const idArray = ids.split(',').map(id => id.trim());
      query._id = { $in: idArray };
    }
     const users = await User.find(query); // Adjust selected fields as needed
    return res.status(200).json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    return res.status(500).json({ error: 'Failed to retrieve users.' });
  }
});

/**
 * PUT /api/users/:id
 * Updates user details or status.
 * Expects a JSON payload in the request body.
 */
router.put('/users/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    const updateData = req.body;

    // Find the user by id and update, returning the updated document.
    const updatedUser = await User.findByIdAndUpdate(userId, updateData, { new: true });
    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found.' });
    }
    return res.status(200).json(updatedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    return res.status(500).json({ error: 'Failed to update user.' });
  }
});

/**
 * DELETE /api/users/:id
 * Deletes a user by ID.
 */
router.delete('/users/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    const deletedUser = await User.findByIdAndDelete(userId);
    if (!deletedUser) {
      return res.status(404).json({ error: 'User not found.' });
    }
    return res.status(200).json({ message: 'User deleted successfully.' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return res.status(500).json({ error: 'Failed to delete user.' });
  }
});

module.exports = router;
