const mongoose = require('mongoose');
const Order = require('../../models/orderSchema');
const User = require('../../models/userSchema');
const Product = require('../../models/productSchema');

// List orders (descending by CreatedOn) - for initial page load
const getOrders = async (req, res) => {
    try {
        const orders = await Order.find()
            .populate({
                path: 'userId',
                select: 'name email'
            })
            .populate({
                path: 'OrderedItems.Product',
                select: 'ProductName'
            })
            .sort({ CreatedOn: -1 });
        
       
        const validOrders = orders.map(order => {
            const orderObj = order.toObject();
            if (!orderObj.userId) {
                orderObj.userId = { name: 'N/A', email: 'N/A' };
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
                select: 'name email',
                match: { name: { $exists: true }, email: { $exists: true } }
            })
            .populate({
                path: 'OrderedItems.Product',
                select: 'ProductName'
            });

        console.log("Order found:", JSON.stringify(order, null, 2));

        if (!order) {
            return res.status(404).send('Order not found');
        }

       
        if (!order.userId || !order.userId.name) {
            order.userId = { name: 'N/A', email: 'N/A' }; 
        if (!order.OrderedItems || !order.OrderedItems.length) {
            order.OrderedItems = []; 
        }

        res.render('admin-order-details', { order }); 
    }
 } catch (error) {
        console.error('Error fetching order details:', error);
        res.status(500).send('Error fetching order details: ' + error.message);
    }

}
const updateOrderStatus = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        const { status } = req.body;
        
        console.log("Updating order status for Order ID:", orderId, "New status:", status);

        if (!status) {
            return res.status(400).json({ success: false, message: 'Status is required' });
        }

        let query = {};
        if (mongoose.Types.ObjectId.isValid(orderId)) {
            query = { $or: [{ _id: orderId }, { OrderId: orderId }] };
        } else {
            query = { OrderId: orderId };
        }

        const order = await Order.findOne(query);
        
        if (!order) {
            console.log("Order not found for ID:", orderId);
            return res.status(404).json({ success: false, message: 'Order not found' });
        }
        
        const validStatuses = ['Pending', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status' });
        }
        
        order.Status = status;
        await order.save();
        
        console.log(`Order ${orderId} status updated successfully to ${status}`);
        
        res.json({ success: true, message: 'Order status updated successfully' });
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ success: false, message: 'Error updating order status: ' + error.message });
    }
};

const verifyReturnRequest = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        const order = await Order.findOne({ $or: [{ OrderId: orderId }, { _id: orderId }] })
            .populate({
                path: 'userId',
                select: 'name email wallet'
            });
        if (!order) {
            return res.json({ success: false, message: 'Order not found' });
        }
        if (order.Status !== 'Delivered') {
            return res.json({ success: false, message: 'Order must be delivered to request a return' });
        }
        order.Status = 'Return Request';
        await order.save();

        // Refund to user's wallet if user exists
        if (order.userId) {
            order.userId.wallet = (order.userId.wallet || 0) + order.FinalAmount;
            await order.userId.save();
        } else {
            console.log('No user found for refund');
        }

        // Update stock for returned products
        for (let item of order.OrderedItems) {
            if (!item.Product) continue;
            
            const product = await Product.findById(item.Product);
            if (product && product.Variants) {
                const variant = product.Variants.find(v => v.Size === item.Size);
                if (variant) {
                    variant.Quantity += item.Quantity;
                    await product.save();
                }
            }
        }

        res.json({ success: true, message: 'Return request verified, amount refunded to wallet' });
    } catch (error) {
        console.error('Error verifying return request:', error);
        res.json({ success: false, message: 'Error verifying return request' });
    }
};

// Search, sort, filter, and paginate orders - for AJAX
const paginateOrders = async (req, res) => {
    try {
        // Get and sanitize parameters
        const page = parseInt(req.query.page) || 1;
        const limit = 5;
        const skip = (page - 1) * limit;
        const query = req.query.q || '';
        const sortBy = req.query.sortBy || 'CreatedOn';
        const sortOrder = req.query.sortOrder || 'desc';
        const status = req.query.status || '';

        console.log('Query params:', { page, query, sortBy, sortOrder, status });

        // Build filter
        let filter = {};
        
        // Only add search filter if query is not empty
        if (query && query.trim() !== '') {
            // First try direct string matching for OrderId
            filter.$or = [
                { OrderId: { $regex: query, $options: 'i' } }
            ];
            
            // Try to convert query to ObjectId if it might be one
            if (mongoose.Types.ObjectId.isValid(query)) {
                filter.$or.push({ _id: mongoose.Types.ObjectId(query) });
            }
            
            // Try to find users matching the query
            try {
                const users = await User.find({ 
                    name: { $regex: query, $options: 'i' } 
                }).select('_id');
                
                if (users && users.length > 0) {
                    const userIds = users.map(u => u._id);
                    filter.$or.push({ userId: { $in: userIds } });
                }
            } catch (userError) {
                console.error('Error finding users:', userError);
                // Continue without user filtering
            }
        }
        
        // Add status filter if specified
        if (status && status.trim() !== '') {
            filter.Status = status;
        }

        console.log('Filter for orders query:', JSON.stringify(filter));

        // Count total matching orders
        const totalOrders = await Order.countDocuments(filter);
        const totalPages = Math.ceil(totalOrders / limit) || 1; // Ensure at least 1 page

        // Validate sorting field (security measure)
        const validSortFields = ['CreatedOn', 'TotalPrice', 'Status'];
        const finalSortBy = validSortFields.includes(sortBy) ? sortBy : 'CreatedOn';
        const finalSortOrder = sortOrder === 'asc' ? 1 : -1;
        
        // Query for orders
        const orders = await Order.find(filter)
            .populate({
                path: 'userId',
                select: 'name email'
            })
            .populate({
                path: 'OrderedItems.Product',
                select: 'ProductName'
            })
            .sort({ [finalSortBy]: finalSortOrder })
            .skip(skip)
            .limit(limit)
            .lean(); // Use lean() for better performance

        console.log(`Found ${orders.length} orders`);

        // Process orders to handle null values and formatting
        const processedOrders = orders.map(order => {
            // Handle null userId
            if (!order.userId) {
                order.userId = { name: 'N/A', email: 'N/A' };
            }
            
            // Ensure OrderedItems are properly formatted
            if (order.OrderedItems) {
                order.OrderedItems = order.OrderedItems.map(item => {
                    if (!item.Product) {
                        item.Product = { ProductName: 'Unknown Product' };
                    }
                    return item;
                });
            }
            
            return order;
        });

        // Send the response
        res.json({ 
            success: true, 
            orders: processedOrders, 
            currentPage: page, 
            totalPages,
            query, 
            sortBy: finalSortBy, 
            sortOrder: sortOrder, 
            status 
        });
    } catch (error) {
        console.error('Error paginating orders:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching orders', 
            error: error.message 
        });
    }
};

module.exports = {
    getOrders,
    getOrderDetails,
    updateOrderStatus,
    verifyReturnRequest,
    paginateOrders
};