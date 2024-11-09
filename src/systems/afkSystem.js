const afkUsers = new Map();

module.exports = {
    afkUsers,
    
    setAfk(userId, reason) {
        afkUsers.set(userId, {
            reason: reason || 'No reason provided',
            timestamp: Date.now()
        });
    },

    removeAfk(userId) {
        return afkUsers.delete(userId);
    },

    isAfk(userId) {
        return afkUsers.has(userId);
    },

    getAfkInfo(userId) {
        return afkUsers.get(userId);
    }
}; 