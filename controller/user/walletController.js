
const Wallet = require('../../models/walletSchema');
const Transaction = require('../../models/walletTransactionSchema');

const getWallet = async (req, res) => {
  try {
    const userId = req.session.User; 
    console.log(userId);
    
    let wallet = await Wallet.findOne({ userId });
    if (!wallet) {
      wallet = new Wallet({ userId, balance: 0 });
      await wallet.save();
    }

    const transactions = await Transaction.find({ userId })
      .sort({ date: -1 }); // Sort by date, newest first

    res.render('wallet', { wallet, transactions });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
};

const addFunds = async (req, res) => {
  try {
    const userId = req.session.User;
    const { amount, paymentMethod } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }

    if (!['credit_card', 'debit_card', 'upi'].includes(paymentMethod)) {
      return res.status(400).json({ message: 'Invalid payment method' });
    }

    // Update wallet balance
    let wallet = await Wallet.findOne({ userId });
    if (!wallet) {
      wallet = new Wallet({ userId, balance: 0 });
    }
    wallet.balance += parseFloat(amount);
    await wallet.save();

    // Create transaction
    const transaction = new Transaction({
      userId,
      type: 'credit',
      amount: parseFloat(amount),
      description: `Added funds via ${paymentMethod.replace('_', ' ')}`
    });
    await transaction.save();

    res.status(200).json({ message: 'Funds added successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getAllTransactions = async (req, res) => {
  try {
    const userId = req.session.User;
    const transactions = await Transaction.find({ userId })
      .sort({ date: -1 }); // Sort by date, newest first

    res.render('wallet-transactions', { transactions });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
};

module.exports = {
  getWallet,
  addFunds,
  getAllTransactions
};