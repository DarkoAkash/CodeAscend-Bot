class Formatter {
    static formatCurrency(amount) {
        return `${amount.toLocaleString()} coins`;
    }

    static formatItemDescription(item) {
        return `**${item.name}** - ${item.description}\nPrice: ${this.formatCurrency(item.price)}`;
    }
}

module.exports = Formatter; 