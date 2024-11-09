const mongoose = require('mongoose');
const User = require('../models/userSchema');

async function updateExistingUsers() {
    try {
        // First, find all users
        const users = await User.find({});
        
        // Update each user
        for (const user of users) {
            const updates = {};
            
            // Check and set default values if fields are missing
            if (typeof user.balance === 'undefined') updates.balance = 0;
            if (typeof user.bankBalance === 'undefined') updates.bankBalance = 0;
            if (typeof user.bankLimit === 'undefined') updates.bankLimit = 10000;
            if (!Array.isArray(user.transactions)) updates.transactions = [];
            
            // Only update if there are changes needed
            if (Object.keys(updates).length > 0) {
                await User.updateOne(
                    { _id: user._id },
                    { $set: updates }
                );
            }
        }
        
        console.log('Successfully updated all users with default values');
    } catch (error) {
        console.error('Error updating users:', error);
        throw error;
    }
}

module.exports = { updateExistingUsers }; 