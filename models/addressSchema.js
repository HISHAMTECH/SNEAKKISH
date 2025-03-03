const mongoose = require('mongoose');
const { Schema } = mongoose;

const addressSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true // 
  },
  Address: [{ 
    addressType: {
      type: String,
      required: true
    },
    Name: {
      type: String,
      required: true
    },
    City: {
      type: String,
      required: true
    },
    Landmark: {
      type: String,
      required: false 
    },
    State: {
      type: String,
      required: true
    },
    Pincode: {
      type: Number,
      required: true
    },
    Phone: {
      type: Number,
      required: true
    },
    AltPhone: {
      type: Number,
      required: false 
    },
    isDefault: {
      type: Boolean,
      default: false // Added isDefault field
    }
  }]
});

const Address = mongoose.model('Address', addressSchema);
module.exports = Address;