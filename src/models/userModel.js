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
        default: 0,
        min: 0
    },
    inventory: [inventoryItemSchema],
    inventoryLimit: {
        type: Number,
        default: 20 // Default inventory space
    },
    vault: [vaultItemSchema],
    vaultLimit: {
        type: Number,
        default: 10 // Default vault space
    },
    // Other user fields...
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

// Method to check inventory space
userSchema.methods.getInventorySpace = function() {
    const usedSpace = this.inventory.reduce((total, item) => total + item.quantity, 0);
    return {
        used: usedSpace,
        total: this.inventoryLimit,
        remaining: this.inventoryLimit - usedSpace
    };
};

// Method to check vault space
userSchema.methods.getVaultSpace = function() {
    const usedSpace = this.vault.reduce((total, item) => total + item.quantity, 0);
    return {
        used: usedSpace,
        total: this.vaultLimit,
        remaining: this.vaultLimit - usedSpace
    };
};

// Method to add item to inventory with space check
userSchema.methods.addToInventory = async function(itemId, quantity) {
    const space = this.getInventorySpace();
    if (space.remaining < quantity) {
        throw new Error(`Not enough inventory space. You need ${quantity} slots but only have ${space.remaining} available.`);
    }

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
    
    return this.save();
};

// Method to add item to vault
userSchema.methods.addToVault = async function(itemId, quantity) {
    const space = this.getVaultSpace();
    if (space.remaining < quantity) {
        throw new Error(`Not enough vault space. You need ${quantity} slots but only have ${space.remaining} available.`);
    }

    const existingItem = this.vault.find(item => item.itemId === itemId);
    
    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        this.vault.push({
            itemId,
            quantity,
            storedAt: new Date()
        });
    }
    
    return this.save();
};

// Method to move item between inventory and vault
userSchema.methods.moveToVault = async function(itemId, quantity) {
    const inventoryItem = this.inventory.find(item => item.itemId === itemId);
    if (!inventoryItem || inventoryItem.quantity < quantity) {
        throw new Error('Not enough items in inventory');
    }

    const vaultSpace = this.getVaultSpace();
    if (vaultSpace.remaining < quantity) {
        throw new Error(`Not enough vault space. Need ${quantity} slots, have ${vaultSpace.remaining}`);
    }

    await this.removeFromInventory(itemId, quantity);
    await this.addToVault(itemId, quantity);
};

userSchema.methods.moveFromVault = async function(itemId, quantity) {
    const vaultItem = this.vault.find(item => item.itemId === itemId);
    if (!vaultItem || vaultItem.quantity < quantity) {
        throw new Error('Not enough items in vault');
    }

    const inventorySpace = this.getInventorySpace();
    if (inventorySpace.remaining < quantity) {
        throw new Error(`Not enough inventory space. Need ${quantity} slots, have ${inventorySpace.remaining}`);
    }

    // Remove from vault
    vaultItem.quantity -= quantity;
    if (vaultItem.quantity === 0) {
        this.vault = this.vault.filter(item => item.itemId !== itemId);
    }

    // Add to inventory
    await this.addToInventory(itemId, quantity);
    await this.save();
};

// Method to upgrade inventory space
userSchema.methods.upgradeInventorySpace = async function(additionalSpace, cost) {
    if (this.balance < cost) {
        throw new Error('Insufficient balance for upgrade');
    }

    this.balance -= cost;
    this.inventoryLimit += additionalSpace;
    return this.save();
};

// Method to upgrade vault space
userSchema.methods.upgradeVaultSpace = async function(additionalSpace, cost) {
    if (this.balance < cost) {
        throw new Error('Insufficient balance for upgrade');
    }

    this.balance -= cost;
    this.vaultLimit += additionalSpace;
    return this.save();
};

// Method to add item to inventory
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
    
    return this.save();
};

// Method to remove item from inventory
userSchema.methods.removeFromInventory = async function(itemId, quantity) {
    const existingItem = this.inventory.find(item => item.itemId === itemId);
    
    if (!existingItem) {
        throw new Error('Item not found in inventory');
    }
    
    if (existingItem.quantity < quantity) {
        throw new Error('Not enough items in inventory');
    }
    
    existingItem.quantity -= quantity;
    
    // Remove the item entirely if quantity is 0
    if (existingItem.quantity === 0) {
        this.inventory = this.inventory.filter(item => item.itemId !== itemId);
    }
    
    return this.save();
};

// Method to check if user has enough of an item
userSchema.methods.hasItem = function(itemId, quantity = 1) {
    const item = this.inventory.find(item => item.itemId === itemId);
    return item && item.quantity >= quantity;
};

// Method to get inventory item
userSchema.methods.getInventoryItem = function(itemId) {
    return this.inventory.find(item => item.itemId === itemId);
};

// Method to update balance
userSchema.methods.updateBalance = async function(amount) {
    if (this.balance + amount < 0) {
        throw new Error('Insufficient balance');
    }
    
    this.balance += amount;
    return this.save();
};

const User = mongoose.model('User', userSchema);

module.exports = User; 