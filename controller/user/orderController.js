// controller/user/orderController.js
const mongoose = require('mongoose');
const Product = require('../../models/productSchema');
const Order = require('../../models/orderSchema');
const Wallet = require('../../models/walletSchema')
const Transaction = require('../../models/walletTransactionSchema')
const PDFDocument = require('pdfkit');



// const getOrders = async (req, res) => {
//     try {
//         const userId = req.session.User?._id;
//         if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
//             return res.redirect('/orders?error=Invalid user session');
//         }

//         const orders = await Order.find({ userId: userId }).populate('OrderedItems.Product');
//         console.log("userId", userId);
//         console.log("orders", orders);
//         console.log("fdf",orders.OrderedItems);
        
    
        

//         res.render('orders', { orders });
//     } catch (error) {
//         console.error('Error in getOrders:', error);
//         res.status(500).send('Error fetching orders');
//     }
// };

// const getOrderHistory = async (req, res) => {
//     try {
//         const userId = req.session.User?._id;
//         const orders = await Order.find({ userId }).populate('OrderedItems.Product');
        
        
//         res.render('orders', { orders });
//     } catch (error) {
//         console.error('Error in getOrderHistory:', error);
//         res.render('orders', { orders: [], error: 'Error loading orders' });
//     }
// };

// const getOrderDetails = async (req, res) => {
//     try {
//         const order = await Order.findOne({ OrderId: req.params.orderId })
//             .populate({
//                 path: 'OrderedItems.Product',
//                 model: 'Product'
//             });

//         // Filter out items with missing or invalid Product references
//         order.OrderedItems = order.OrderedItems.filter(item => item.Product !== null);

//         console.log("ORD", order.OrderedItems); // Verify populated data

//         if (!order) {
//             return res.status(404).render('error', { message: 'Order not found' });
//         }
//         console.log(order);
        

//         // Ensure all required fields are present (default to 0 if missing)
//         order.TotalPrice = order.TotalPrice || 0;
//         order.Tax = order.Tax || 0;
//         order.Discount = order.Discount || 0;
//         order.WalletAmount = order.WalletAmount || 0;
//         order.FinalAmount = order.FinalAmount || 0;

//         res.render('order-detail', { order });
//     } catch (error) {
//         console.error('Error in getOrderDetails:', error);
//         res.status(500).render('error', { message: 'Error loading order details' });
//     }
// };

const getOrders = async (req, res) => {
    try {
        const userId = req.session.User?._id;
        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.redirect('/orders?error=Invalid user session');
        }

        // Sort orders by InvoiceDate in descending order (newest first)
        const orders = await Order.find({ userId: userId })
            .populate('OrderedItems.Product')
            .sort({ InvoiceDate: -1 }); // Added sorting

        console.log("userId", userId);
        console.log("orders", orders);
        console.log("fdf", orders.OrderedItems);

        res.render('orders', { orders });
    } catch (error) {
        console.error('Error in getOrders:', error);
        res.status(500).send('Error fetching orders');
    }
};

const getOrderHistory = async (req, res) => {
    try {
        const userId = req.session.User?._id;
        // Sort orders by InvoiceDate in descending order (newest first)
        const orders = await Order.find({ userId })
            .populate('OrderedItems.Product')
            .sort({ InvoiceDate: -1 }); // Added sorting

        res.render('orders', { orders });
    } catch (error) {
        console.error('Error in getOrderHistory:', error);
        res.render('orders', { orders: [], error: 'Error loading orders' });
    }
};

// const getOrderDetails = async (req, res) => {
//     try {
//         const order = await Order.findOne({ OrderId: req.params.orderId })
//             .populate({
//                 path: 'OrderedItems.Product',
//                 model: 'Product'
//             });

//         // Filter out items with missing or invalid Product references
//         order.OrderedItems = order.OrderedItems.filter(item => item.Product !== null);

//         console.log("ORD", order.OrderedItems); // Verify populated data

//         if (!order) {
//             return res.status(404).render('error', { message: 'Order not found' });
//         }
//         console.log("dsd",order.OrderedItems);

//         // Ensure all required fields are present (default to 0 if missing)
//         order.TotalPrice = order.TotalPrice || 0;
//         order.Tax = order.Tax || 0;
//         order.Discount = order.Discount || 0;
//         order.WalletAmount = order.WalletAmount || 0;
//         order.FinalAmount = order.FinalAmount || 0;

//         res.render('order-detail', { order });
//     } catch (error) {
//         console.error('Error in getOrderDetails:', error);
//         res.status(500).render('error', { message: 'Error loading order details' });
//     }
// };

const getOrderDetails = async (req, res) => {
    try {
        const order = await Order.findOne({ OrderId: req.params.orderId })
            .populate({
                path: 'OrderedItems.Product',
                model: 'Product'
            });

        // Filter out items with missing or invalid Product references
        order.OrderedItems = order.OrderedItems.filter(item => item.Product !== null);

        console.log("ORD", order.OrderedItems); // Verify populated data
        console.log("Order Discount in getOrderDetails:", order.Discount); // Log the discount value

        if (!order) {
            return res.status(404).render('error', { message: 'Order not found' });
        }
        console.log("dsd", order.OrderedItems);

        // Ensure all required fields are present (default to 0 if missing)
        order.TotalPrice = order.TotalPrice || 0;
        order.Tax = order.Tax || 0;
        order.Discount = order.Discount || 0;
        order.WalletAmount = order.WalletAmount || 0;
        order.FinalAmount = order.FinalAmount || 0;

        res.render('order-detail', { order });
    } catch (error) {
        console.error('Error in getOrderDetails:', error);
        res.status(500).render('error', { message: 'Error loading order details' });
    }
};

const cancelOrder = async (req, res) => {
    try {
        const order = await Order.findOne({ OrderId: req.params.orderId });
        if (!order) {
            return res.json({ success: false, message: 'Order not found' });
        }
        if (order.Status !== 'Pending') {
            return res.json({ success: false, message: 'Cannot cancel order - status is not Pending' });
        }

        await Order.updateOne(
            { OrderId: req.params.orderId },
            {
                $set: {
                    Status: 'Cancelled',
                    CancellationReason: req.body.reason || 'Not specified'
                }
            }
        );

        for (let item of order.OrderedItems) {
            const numericSize = parseInt(item.Size);
            await Product.updateOne(
                { _id: item.Product, 'Variants.Size': numericSize },
                { $inc: { 'Variants.$.Quantity': item.Quantity } }
            );
        }

        const userId = order.userId;
        let wallet = await Wallet.findOne({ userId });
        if (!wallet) {
            wallet = new Wallet({ userId, balance: 0 });
        }

        const refundAmount = order.WalletAmount + (order.PaymentMethod === 'cod' || order.PaymentMethod === 'mixed' ? order.FinalAmount : 0);
        if (refundAmount > 0) {
            wallet.balance += refundAmount;
            await wallet.save();

            const transaction = new Transaction({
                userId,
                type: 'credit',
                amount: refundAmount,
                description: `Refund for canceled order ${order.OrderId}`
            });
            await transaction.save();
        }

        res.json({ success: true, message: 'Order canceled and amount refunded' });
    } catch (error) {
        console.error('Error in cancelOrder:', error);
        res.json({ success: false, message: 'Error cancelling order' });
    }
};

const returnOrder = async (req, res) => {
    try {
        const order = await Order.findOne({ OrderId: req.params.orderId });
        if (!order) {
            return res.json({ success: false, message: 'Order not found' });
        }
        if (order.Status !== 'Delivered') {
            return res.json({ success: false, message: 'Cannot return order - not Delivered' });
        }
        if (!req.body.reason) {
            return res.json({ success: false, message: 'Return reason required' });
        }

        await Order.updateOne(
            { OrderId: req.params.orderId },
            {
                $set: {
                    Status: 'Return Requested',
                    ReturnReason: req.body.reason
                }
            }
        );

        for (let item of order.OrderedItems) {
            const numericSize = parseInt(item.Size);
            await Product.updateOne(
                { _id: item.Product, 'Variants.Size': numericSize },
                { $inc: { 'Variants.$.Quantity': item.Quantity } }
            );
        }

        const userId = order.userId;
        let wallet = await Wallet.findOne({ userId });
        if (!wallet) {
            wallet = new Wallet({ userId, balance: 0 });
        }

        const refundAmount = order.WalletAmount + (order.PaymentMethod === 'cod' || order.PaymentMethod === 'mixed' ? order.FinalAmount : 0);
        if (refundAmount > 0) {
            wallet.balance += refundAmount;
            await wallet.save();

            const transaction = new Transaction({
                userId,
                type: 'credit',
                amount: refundAmount,
                description: `Refund for Returned order ${order.OrderId}`
            });
            await transaction.save();
        }


        res.json({ success: true, message: 'Return request submitted' });
    } catch (error) {
        console.error('Error in returnOrder:', error);
        res.json({ success: false, message: 'Error requesting return' });
    }
};



const downloadInvoice = async (req, res) => {
    try {
        const order = await Order.findOne({ OrderId: req.params.orderId }).populate('OrderedItems.Product');
        const doc = new PDFDocument();
        res.setHeader('Content-disposition', `attachment; filename=invoice-${order.OrderId}.pdf`);
        res.setHeader('Content-type', 'application/pdf');
        doc.pipe(res);

        doc.text(`Order ID: ${order.OrderId}`);
        doc.text(`Date: ${order.InvoiceDate}`);
        order.OrderedItems.forEach(item => {
            doc.text(`${item.Product.name} - ${item.Quantity} x $${item.Price}`);
        });
        doc.text(`Total: $${order.FinalAmount}`);
        doc.end();
    } catch (error) {
        res.status(500).send('Error generating invoice');
    }
};
module.exports={
    getOrders,
    getOrderDetails,
    cancelOrder,
    returnOrder,
    downloadInvoice


}