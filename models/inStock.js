const mongoose = require('mongoose');

const inStockSchema = new mongoose.Schema({
  pet: { type: mongoose.Schema.Types.ObjectId, ref: 'Pet' },
  quantity: Number,
  price: Number
});

const InStock = mongoose.model('InStock', inStockSchema);
module.exports = InStock;
