// models/fruit.js

const mongoose = require('mongoose');

const petSchema = new mongoose.Schema({
  name: String,
  breed: String,
  age: Number,
  type: { type: String, enum: ['Dog', 'Cat', 'Bird', 'Reptile'] },
  price: Number,
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  inStock: [{ type: mongoose.Schema.Types.ObjectId, ref: 'InStock' }]
});

const Pet = mongoose.model('Pet', petSchema);
module.exports = Pet;
