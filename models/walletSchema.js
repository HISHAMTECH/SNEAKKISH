const mongoose = require('mongoose');

const WalletSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  balance: { type: Number, default: 0.00 }
});

const Wallet= mongoose.model('Wallet', WalletSchema);
module.exports = Wallet