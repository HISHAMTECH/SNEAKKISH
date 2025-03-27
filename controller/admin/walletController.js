const wallet = require('../../models/walletSchema');
const walletTransaction = require('../../models/walletTransactionSchema');

const getWallet = async (req, res) => {
    try {
        const walletData = await wallet.find().populate('userId', 'FirstName LastName');
        res.render('admin-wallet', {
            wallet: walletData
        });
    } catch (error) {
        console.error('Error Wallet Details:', error);
        res.status(500).send('Error Wallet Details');
    }
};

const getwalletTransactions = async (req, res) => {
    try {
        const userId = req.params.userId;
        if (!userId) {
            return res.status(400).send('User ID is required');
        }
        const walletTransactionData = await walletTransaction.find({ userId: userId });
        console.log(walletTransactionData);
        res.render('admin-walletTransaction', {
            Transaction: walletTransactionData
        });
    } catch (error) {
        console.error('Error fetching Wallet Transaction Details:', error);
        res.status(500).send('Error fetching Wallet Transaction Details');
    }
};

module.exports = {
    getWallet,
    getwalletTransactions
};