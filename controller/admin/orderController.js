const mongoose = require('mongoose');
const Order = require('../../models/orderSchema');
const User = require('../../models/userSchema');
const Product = require('../../models/productSchema');
const Wallet = require('../../models/walletSchema');
const Transaction = require('../../models/walletTransactionSchema');

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
            .sort({ InvoiceDate: -1 });


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
            sortBy: 'InvoiceDate', 
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
            'Delivered': ['Return Request', 'Cancelled'],
            'Return Request': [],
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

// Handle full order return request
const handleReturnRequest = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        const { action, reason, status } = req.body;

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

                const transaction = new Transaction({
                    userId: order.userId._id,
                    type: 'credit',
                    amount: order.FinalAmount || order.TotalPrice || 0,
                    description: `Refund for returned order ${order.OrderId}`
                });
                await transaction.save();
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

// Handle single item return request
const handleItemReturnRequest = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        const { action, reason, itemIndex } = req.body;

        console.log("Received item return request:", { orderId, action, reason, itemIndex });

        const order = await Order.findOne({ OrderId: orderId })
            .populate({
                path: 'userId',
                select: 'FirstName LastName Email Wallet'
            });

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        const item = order.OrderedItems[itemIndex];
        if (!item || item.ReturnStatus !== 'Return Requested') {
            return res.status(400).json({ success: false, message: 'Item not found or not in Return Requested status' });
        }

        if (!action || !['accept', 'deny'].includes(action)) {
            return res.status(400).json({ success: false, message: 'Valid action (accept or deny) is required' });
        }

        if (action === 'deny' && !reason) {
            return res.status(400).json({ success: false, message: 'Reason is required to deny return' });
        }

        if (action === 'accept') {
            item.ReturnStatus = 'Returned';
            item.ItemReturnReason = reason || 'Item return accepted';

            // Calculate refund amount including proportional discount
            const itemSubtotal = item.Price * item.Quantity;
            const totalOrderSubtotal = order.OrderedItems.reduce((sum, i) => sum + (i.Price * i.Quantity), 0);
            const discountProportion = order.Discount && totalOrderSubtotal > 0 ? (itemSubtotal / totalOrderSubtotal) : 0;
            const itemDiscount = order.Discount * discountProportion;
            const refundAmount = itemSubtotal - itemDiscount;

            if (order.userId && order.userId.Wallet !== undefined) {
                // Update wallet balance
                let wallet = await Wallet.findOne({ userId: order.userId._id });
                if (!wallet) {
                    wallet = new Wallet({ userId: order.userId._id, balance: 0 });
                }
                wallet.balance += refundAmount;
                await wallet.save();
                console.log("Wallet updated for user:", order.userId._id, "New balance:", wallet.balance);

                // Create transaction
                const transaction = new Transaction({
                    userId: order.userId._id,
                    type: 'credit',
                    amount: refundAmount,
                    description: `Refund for returned item in order ${order.OrderId}`
                });
                await transaction.save();
            } else {
                console.warn("User or Wallet field not found, skipping refund");
            }

            // Update product stock
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
        } else if (action === 'deny') {
            item.ReturnStatus = 'Denied';
            item.ItemReturnReason = `Denied: ${reason}`;
        }

        await order.save();
        console.log("Order updated:", order.toJSON());

        res.json({ success: true, message: `Item return request ${action === 'accept' ? 'accepted and refunded' : 'denied'}` });
    } catch (error) {
        console.error('Error handling item return request:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error handling item return request: ' + error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

// Updated paginate function to properly handle date fields and search by customer name
const paginate = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10; // Number of orders per page

        const query = req.query.q ? req.query.q.trim() : '';
        const sortBy = req.query.sortBy || 'CreatedOn'; // Default to CreatedOn
        const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1; // Default to desc (-1)
        const statusFilter = req.query.status || '';

        const searchCriteria = {};

        // Search by OrderId or customer name (from populated userId)
        if (query) {
            // Check if query looks like an ObjectId
            const isObjectId = /^[0-9a-fA-F]{24}$/.test(query);
            
            searchCriteria.$or = [
                { OrderId: { $regex: query, $options: 'i' } }
            ];
            
            // If it could be an ObjectId, add that to search criteria
            if (isObjectId) {
                searchCriteria.$or.push({ _id: query });
            }
            
            // Add regex search for customer name fields
            searchCriteria.$or.push({ 'CustomerName': { $regex: query, $options: 'i' } });
        }

        // Filter by status if provided
        if (statusFilter) {
            searchCriteria.Status = statusFilter;
        }

        // Count total matching documents
        const totalOrders = await Order.countDocuments(searchCriteria);
        const totalPages = Math.ceil(totalOrders / limit);
        const skip = (page - 1) * limit;

        // Create sort options based on requested sort field
        const sortOptions = {};
        sortOptions[sortBy] = sortOrder;

        // Fetch orders with all filters applied
        const orders = await Order.find(searchCriteria)
            .sort(sortOptions)
            .skip(skip)
            .limit(limit)
            .populate({
                path: 'userId',
                select: 'FirstName LastName Email'
            })
            .lean();

        // Process orders to ensure consistent date format
        const processedOrders = orders.map(order => {
            // Ensure date fields are properly formatted
            if (order.CreatedOn) {
                order.formattedDate = new Date(order.CreatedOn).toLocaleDateString();
            } else if (order.InvoiceDate) {
                order.formattedDate = new Date(order.InvoiceDate).toLocaleDateString();
                // Use InvoiceDate as CreatedOn if CreatedOn is missing
                order.CreatedOn = order.InvoiceDate;
            } else {
                order.formattedDate = 'Unknown';
            }
            
            // Handle missing userId
            if (!order.userId) {
                order.userId = { FirstName: 'N/A', LastName: '', Email: 'N/A' };
            }
            
            return order;
        });

        res.json({
            success: true,
            orders: processedOrders,
            currentPage: page,
            totalPages
        });
    } catch (err) {
        console.error('Pagination error:', err);
        res.status(500).json({
            success: false,
            message: 'Server error occurred while fetching orders.'
        });
    }
};

module.exports = {
    getOrders,
    getOrderDetails,
    updateOrderStatus,
    handleReturnRequest,
    handleItemReturnRequest,
    paginate
};