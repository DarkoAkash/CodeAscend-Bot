const mongoose = require('mongoose');

const inventoryItemSchema = new mongoose.Schema({
    itemId: {
        type: String,
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 0
    },
    purchasedAt: {
        type: Date,
        default: Date.now
    }
});

const vaultItemSchema = new mongoose.Schema({
    itemId: {
        type: String,
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 0
    },
    storedAt: {
        type: Date,
        default: Date.now
    }
});

const userSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        unique: true
    },
    balance: {
        type: Number,
        default: 1000,
        min: 0
    },
    inventory: [inventoryItemSchema],
    inventoryLimit: {
        type: Number,
        default: 20
    },
    vault: [vaultItemSchema],
    vaultLimit: {
        type: Number,
        default: 10
    },
    lastDaily: Date,
    experience: {
        type: Number,
        default: 0
    },
    level: {
        type: Number,
        default: 1
    }
}, {
    timestamps: true
});

userSchema.methods.updateBalance = async function(amount) {
    const newBalance = this.balance + amount;
    if (newBalance < 0) {
        throw new Error('Insufficient balance');
    }
    this.balance = newBalance;
    await this.save();
    return this.balance;
};

userSchema.methods.addToInventory = async function(itemId, quantity) {
    const existingItem = this.inventory.find(item => item.itemId === itemId);
    
    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        this.inventory.push({
            itemId,
            quantity,
            purchasedAt: new Date()
        });
    }
    
    return await this.save();
};

userSchema.methods.hasItem = function(itemId, quantity = 1) {
    const item = this.inventory.find(item => item.itemId === itemId);
    return item && item.quantity >= quantity;
};

const User = mongoose.models.User || mongoose.model('User', userSchema);

module.exports = User; 