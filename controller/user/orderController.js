// controller/user/orderController.js
const mongoose = require('mongoose');
const Product = require('../../models/productSchema');
const Order = require('../../models/orderSchema');
const PDFDocument = require('pdfkit');



const getOrders = async (req, res) => {
    try {
        const userId = req.session.User?._id;
        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.redirect('/orders?error=Invalid user session');
        }

        const orders = await Order.find({ userId: userId }).populate('OrderedItems.Product');
        console.log("userId", userId);
        console.log("orders", orders);
        orders.forEach(order => {
            console.log("Order ID:", order.OrderId || order._id);
            console.log("Address:", order.Address);
        });

        res.render('orders', { orders });
    } catch (error) {
        console.error('Error in getOrders:', error);
        res.status(500).send('Error fetching orders');
    }
};





const getOrderDetail = async (req, res) => {
    try {
     
        
        const order = await Order.findOne({ OrderId: req.params.orderId }).populate('OrderedItems.Product');
        if (!order) return res.status(404).send('Order not found');
        res.render('order-detail', { order });
    } catch (error) {
        res.status(500).send('Error fetching order details');
    }
};
const cancelOrder = async (req, res) => {
    try {
        const order = await Order.findOne({ OrderId: req.params.orderId });
        if (order.Status !== 'Pending') return res.redirect('/orders?error=Cannot cancel order');

        order.Status = 'Cancelled';
        order.CancellationReason = req.body.reason || 'Not specified';
        for (let item of order.OrderedItems) {
            await Product.updateOne({ _id: item.Product }, { $inc: { stock: item.Quantity } });
        }
        await order.save();
        res.redirect('/orders');
    } catch (error) {
        res.status(500).send('Error cancelling order');
    }
};

const returnOrder = async (req, res) => {
    try {
        const order = await Order.findOne({ OrderId: req.params.orderId });
        if (order.Status !== 'Delivered') return res.redirect('/orders?error=Cannot return order');
        if (!req.body.reason) return res.redirect('/orders?error=Return reason required');

        order.Status = 'Return Request';
        order.ReturnReason = req.body.reason;
        await order.save();
        res.redirect('/orders');
    } catch (error) {
        res.status(500).send('Error requesting return');
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
    
    getOrderDetail,
    cancelOrder,
    returnOrder,
    downloadInvoice


}