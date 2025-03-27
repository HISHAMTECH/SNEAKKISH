const mongoose = require('mongoose');
const Order = require('../../models/orderSchema');
const User = require('../../models/userSchema');
const Product = require('../../models/productSchema');

// List orders
const getOrders = async (req, res) => {
    try {
        const orders = await Order.find()
            .populate({
                path: 'userId',
                select: 'FirstName Email'
            })
            .populate({
                path: 'OrderedItems.Product',
                select: 'ProductName'
            })
            .sort({ CreatedOn: -1 });

        const validOrders = orders.map(order => {
            const orderObj = order.toObject();
            if (!orderObj.userId) {
                orderObj.userId = { FirstName: 'N/A', Email: 'N/A' };
            }
            return orderObj;
        });

        res.render('admin-orders', { 
            orders: validOrders, 
            currentPage: 1, 
            totalPages: 1, 
            query: '', 
            sortBy: 'CreatedOn', 
            sortOrder: 'desc', 
            status: '' 
        });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).send('Error fetching orders');
    }
};

// View order details
const getOrderDetails = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        console.log("Order ID from params:", orderId);

        let query = {};
        if (mongoose.Types.ObjectId.isValid(orderId)) {
            query = { $or: [{ _id: orderId }, { OrderId: orderId }] };
        } else {
            query = { OrderId: orderId };
        }

        const order = await Order.findOne(query)
            .populate({
                path: 'userId',
                select: 'FirstName LastName Email Wallet'
            })
            .populate({
                path: 'OrderedItems.Product',
                select: 'ProductName'
            });

        console.log("Order found:", JSON.stringify(order, null, 2));

        if (!order) {
            return res.status(404).send('Order not found');
        }

        if (!order.userId) {
            order.userId = { FirstName: 'Guest', LastName: '', Email: 'N/A', Wallet: 0 };
        }

        console.log(order.Status);
        

        res.render('admin-order-details', { order });
    } catch (error) {
        console.error('Error fetching order details:', error);
        res.status(500).send('Error fetching order details: ' + error.message);
    }
};

// Update order status
const updateOrderStatus = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        const { status } = req.body;

        console.log('Updating order status:', { orderId, status });

        if (!status) {
            return res.status(400).json({ success: false, message: 'Status is required' });
        }

        const validStatuses = ['Pending', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled', 'Return Request', 'Returned'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status' });
        }

        const order = await Order.findOne({ OrderId: orderId });
        if (!order) {
            return res.status(404).json({ success: false, message: `Order not found with ID: ${orderId}` });
        }

        console.log('Current status:', order.Status);

        const statusHierarchy = {
            'Pending': ['Shipped', 'Out for Delivery', 'Delivered', 'Cancelled'],
            'Shipped': ['Out for Delivery', 'Delivered', 'Cancelled'],
            'Out for Delivery': ['Delivered', 'Cancelled'],
            'Delivered': ['Return Request', 'Cancelled'], // Only Return Request or Cancel allowed after Delivered
            'Return Request': [], // No changes allowed until handled
            'Cancelled': [],
            'Returned': []
        };

        if (order.Status === 'Return Request') {
            return res.status(400).json({
                success: false,
                message: 'Status cannot be changed directly while in Return Request. Use Handle Return Request.'
            });
        }

        if (!statusHierarchy[order.Status] || !statusHierarchy[order.Status].includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Invalid transition from ${order.Status} to ${status}. Valid: ${JSON.stringify(statusHierarchy[order.Status] || [])}`
            });
        }

        order.Status = status;
        await order.save();
        console.log('Order status updated:', order);

        res.json({ success: true, message: 'Order status updated successfully' });
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating order status: ' + error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

// Handle return request
const handleReturnRequest = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        const { action, reason, status } = req.body; // Added status from frontend

        console.log("Received return request:", { orderId, action, reason, status });

        const order = await Order.findOne({ OrderId: orderId })
            .populate({
                path: 'userId',
                select: 'FirstName LastName Email Wallet'
            });

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        if (order.Status !== 'Return Requested') {
            return res.status(400).json({ success: false, message: 'Order is not in Return Request status' });
        }

        if (!action || !['accept', 'deny'].includes(action)) {
            return res.status(400).json({ success: false, message: 'Valid action (accept or deny) is required' });
        }

        if (action === 'deny' && !reason) {
            return res.status(400).json({ success: false, message: 'Reason is required to deny return' });
        }

        if (action === 'accept') {
            order.Status = 'Returned';
            order.ReturnReason = reason || 'Return accepted';

            if (order.userId && order.userId.Wallet !== undefined) {
                order.userId.Wallet = (order.userId.Wallet || 0) + (order.FinalAmount || order.TotalPrice || 0);
                await order.userId.save();
                console.log("Wallet updated for user:", order.userId._id, "New balance:", order.userId.Wallet);
            } else {
                console.warn("User or Wallet field not found, skipping refund");
            }

            for (let item of order.OrderedItems) {
                if (!item.Product) continue;

                const product = await Product.findById(item.Product);
                if (product && product.Variants) {
                    const variant = product.Variants.find(v => v.Size === item.Size);
                    if (variant) {
                        variant.Quantity += item.Quantity;
                        await product.save();
                        console.log("Stock updated for product:", product._id, "Variant:", item.Size, "New quantity:", variant.Quantity);
                    } else {
                        console.warn("Variant not found for product:", item.Product, "Size:", item.Size);
                    }
                } else {
                    console.warn("Product or Variants not found for item:", item.Product);
                }
            }
        } else if (action === 'deny') {
            order.Status = 'Delivered';
            order.ReturnReason = `Denied: ${reason}`;
        }

        await order.save();
        console.log("Order updated:", order.toJSON());

        res.json({ success: true, message: `Return request ${action === 'accept' ? 'accepted and refunded' : 'denied'}` });
    } catch (error) {
        console.error('Error handling return request:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error handling return request: ' + error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

const paginate = async (req, res) => {
    try {
        console.log("Paginate request received");

        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;
        const query = req.query.q || '';
        const sortBy = req.query.sortBy || 'CreatedOn';
        const sortOrder = req.query.sortOrder || 'desc';
        const status = req.query.status || '';

        console.log('Paginate request details:', { page, query, sortBy, sortOrder, status });

        let filter = {};
        if (query) {
            filter.$or = [
                { OrderId: { $regex: query, $options: 'i' } },
                { 'userId.FirstName': { $regex: query, $options: 'i' } }
            ];
        }
        if (status) {
            filter.Status = status;
        }

        const orders = await Order.find(filter)
            .populate('userId', 'FirstName Email')
            .populate('OrderedItems.Product', 'ProductName')
            .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
            .skip(skip)
            .limit(limit);

        const total = await Order.countDocuments(filter);
        const totalPages = Math.ceil(total / limit);

        console.log('Orders fetched:', { totalOrders: total, totalPages, ordersCount: orders.length });

        const formattedOrders = orders.map(order => {
            const orderObj = order.toObject();
            if (!orderObj.userId) {
                orderObj.userId = { FirstName: 'N/A', Email: 'N/A' };
            }
            return orderObj;
        });

        res.json({ success: true, orders: formattedOrders, currentPage: page, totalPages });
    } catch (error) {
        console.error('Error fetching paginated orders:', error);
        res.status(500).json({ success: false, message: 'Error fetching orders: ' + error.message });
    }
};

module.exports = {
    getOrders,
    getOrderDetails,
    updateOrderStatus,
    handleReturnRequest,
    paginate
};