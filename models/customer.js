const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  name: String,
  email: String,
  phone: String,
  address: String,
  pets: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Pet' }]
});

const Customer = mongoose.model('Customer', customerSchema);
module.exports = Customer;
