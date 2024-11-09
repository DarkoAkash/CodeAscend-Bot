const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    guildId: { type: String, required: true },
    balance: { type: Number, default: 0 },
    bankBalance: { type: Number, default: 0 },
    bankLimit: { type: Number, default: 10000 },
    lastDaily: { type: Date },
    inventory: { type: Array, default: [] },
    createdAt: { type: Date, default: Date.now },
    termsAccepted: { type: Boolean, default: false },
    transactions: [{
        type: { type: String, enum: ['deposit', 'withdraw', 'transfer', 'daily', 'shop'] },
        amount: Number,
        timestamp: { type: Date, default: Date.now },
        description: String,
        balance: Number,
        bankBalance: Number
    }],
    lastInterestCollected: { type: Date },
});

module.exports = mongoose.models.User || mongoose.model('User', UserSchema); 