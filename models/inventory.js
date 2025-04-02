// models/inventory.js

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const inventorySchema = new Schema({
    itemName: {
        type: String,
        required: [true, 'Item name is required.'], // Make item name required
        trim: true // Optional: Remove leading/trailing whitespace
    },
    description: {
        type: String,
        trim: true // Optional: Remove leading/trailing whitespace
        // Not required by default
    },
    category: {
        type: String,
        required: [true, 'Category is required.'], // Make category required
        // Ensure these values exactly match the options in your EJS select dropdown
        enum: {
            values: ['Food', 'Toy', 'Accessory', 'Habitat', 'Medicine'],
            message: 'Invalid category selected.' // Custom error message for enum validation
        }
    },
    price: {
        type: Number,
        required: [true, 'Price is required.'], // Make price required
        min: [0, 'Price cannot be negative.'] // Minimum value validation
    },
    quantityInStock: {
        type: Number,
        required: [true, 'Quantity in stock is required.'], // Make quantity required
        min: [0, 'Quantity cannot be negative.'], // Minimum value validation
        default: 0 // Set a default value of 0 for new items
    }
}, {
    // Optional: Adds createdAt and updatedAt timestamps to documents
    timestamps: true
});

// Create the model. Mongoose will create/use a collection named 'inventories' (plural, lowercase)
const Inventory = mongoose.model('Inventory', inventorySchema);

// Export the model so it can be required in server.js
module.exports = Inventory;