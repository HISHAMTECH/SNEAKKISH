const mongoose = require('mongoose');
const Product = require('../../models/productSchema');
const Order = require('../../models/orderSchema');
const Wallet = require('../../models/walletSchema');
const Transaction = require('../../models/walletTransactionSchema');
const PDFDocument = require('pdfkit');

const getOrders = async (req, res) => {
    try {
        const userId = req.session.User?._id;
        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.redirect('/login?redirectTo=/orders');
        }

        // Fetch all orders including those with "Payment Failed" status, sorted by InvoiceDate
        const orders = await Order.find({ userId: userId })
            .populate('OrderedItems.Product')
            .sort({ InvoiceDate: -1 }); // Sort by newest first

        // Pass any error messages from query parameters
        const error = req.query.error || null;

        res.render('orders', { orders, error });
    } catch (error) {
        console.error('Error in getOrders:', error);
        res.render('orders', { orders: [], error: 'Error loading orders' });
    }
};

const getOrderHistory = async (req, res) => {
    try {
        const userId = req.session.User?._id;
        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.redirect('/login?redirectTo=/orders');
        }
        
        // Fetch all orders including those with "Payment Failed" status, sorted by InvoiceDate
        const orders = await Order.find({ userId })
            .populate('OrderedItems.Product')
            .sort({ InvoiceDate: -1 }); // Sort by newest first

        res.render('orders', { orders });
    } catch (error) {
        console.error('Error in getOrderHistory:', error);
        res.render('orders', { orders: [], error: 'Error loading orders' });
    }
};

// const getOrderDetails = async (req, res) => {
//     try {
//         const orderId = req.params.orderId;
        
//         // Populate OrderedItems.Product and userId
//         const order = await Order.findOne({ OrderId: orderId })
//             .populate({
//                 path: 'OrderedItems.Product',
//                 model: 'Product',
//                 select: 'ProductName ProductImage Price'
//             })
//             .populate({
//                 path: 'userId',
//                 model: 'User',
//                 select: 'FirstName LastName Email PhoneNumber Address Wallet'
//             });

//         if (!order) {
//             return res.redirect('/orders?error=Order not found');
//         }

//         // Filter out items with missing or invalid Product references
//         order.OrderedItems = order.OrderedItems.filter(item => item.Product !== null);

//         // Debug: Log the Product and ProductImage fields for each ordered item
//         console.log("Ordered Items:", order.OrderedItems.map(item => ({
//             ProductName: item.Product?.ProductName,
//             ProductImage: item.Product?.ProductImage,
//             Quantity: item.Quantity,
//             Price: item.Price,
//             Size: item.Size
//         })));

//         // Check if this is a payment failed order
//         const isPaymentFailed = order.Status === 'Payment Failed';

//         // Ensure all required fields are present (default to 0 or appropriate value if missing)
//         order.TotalPrice = order.TotalPrice || 0;
//         order.Tax = order.Tax || 0;
//         order.Discount = order.Discount || 0;
//         order.WalletAmount = order.WalletAmount || 0;
//         order.FinalAmount = order.FinalAmount || 0;
//         order.Status = order.Status || 'Pending';
//         order.PaymentMethod = order.PaymentMethod || 'cod';
//         order.CancellationReason = order.CancellationReason || 'none';
//         order.ReturnReason = order.ReturnReason || '';
//         order.PaymentFailureReason = order.PaymentFailureReason || 'Transaction could not be completed';

//         // Ensure Address field is populated correctly
//         order.Address = order.Address || {
//             addressType: 'N/A',
//             City: 'N/A',
//             State: 'N/A',
//             Pincode: 'N/A',
//             _id: order.Address?._id || null
//         };

//         // Optionally, cross-reference with user's addresses if needed
//         if (order.Address._id && order.userId?.Address) {
//             const matchingAddress = order.userId.Address.find(addr => addr._id.equals(order.Address._id));
//             if (matchingAddress) {
//                 order.Address = {
//                     ...order.Address,
//                     Name: matchingAddress.Name,
//                     Landmark: matchingAddress.Landmark,
//                     Phone: matchingAddress.Phone,
//                     AltPhone: matchingAddress.AltPhone,
//                     isDefault: matchingAddress.isDefault
//                 };
//             }
//         }

//         // If payment failed, render a specific template
//         if (isPaymentFailed) {
//             return res.render('order-payment-failed', { 
//                 order,
//                 orderId: order.OrderId || order._id
//             });
//         }

//         // Render the standard order details page
//         res.render('order-detail', { order });
//     } catch (error) {
//         console.error('Error in getOrderDetails:', error);
//         res.redirect('/orders?error=Error loading order details');
//     }
// };

const getOrderDetails = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        
        // Populate OrderedItems.Product and userId
        const order = await Order.findOne({ OrderId: orderId })
            .populate({
                path: 'OrderedItems.Product',
                model: 'Product',
                select: 'ProductName ProductImage Price'
            })
            .populate({
                path: 'userId',
                model: 'User',
                select: 'FirstName LastName Email PhoneNumber Address Wallet'
            });

        if (!order) {
            return res.redirect('/orders?error=Order not found');
        }

        // Filter out items with missing or invalid Product references
        order.OrderedItems = order.OrderedItems.filter(item => item.Product !== null);

        // Ensure all required fields are present (default to 0 or appropriate value if missing)
        order.TotalPrice = order.TotalPrice || 0;
        order.Tax = order.Tax || 0;
        order.Discount = order.Discount || 0;
        order.WalletAmount = order.WalletAmount || 0;
        order.FinalAmount = order.FinalAmount || 0;
        order.Status = order.Status || 'Pending';
        order.PaymentMethod = order.PaymentMethod || 'cod';
        order.CancellationReason = order.CancellationReason || 'none';
        order.ReturnReason = order.ReturnReason || '';
        order.PaymentFailureReason = order.PaymentFailureReason || 'Transaction could not be completed';

        // Ensure Address field is populated correctly
        order.Address = order.Address || {
            addressType: 'N/A',
            City: 'N/A',
            State: 'N/A',
            Pincode: 'N/A',
            _id: order.Address?._id || null
        };

        // Optionally, cross-reference with user's addresses if needed
        if (order.Address._id && order.userId?.Address) {
            const matchingAddress = order.userId.Address.find(addr => addr._id.equals(order.Address._id));
            if (matchingAddress) {
                order.Address = {
                    ...order.Address,
                    Name: matchingAddress.Name,
                    Landmark: matchingAddress.Landmark,
                    Phone: matchingAddress.Phone,
                    AltPhone: matchingAddress.AltPhone,
                    isDefault: matchingAddress.isDefault
                };
            }
        }

        // Render the order details page for all order types including payment failed
        res.render('order-detail', { order });
    } catch (error) {
        console.error('Error in getOrderDetails:', error);
        res.redirect('/orders?error=Error loading order details');
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

        const refundAmount = order.WalletAmount + (order.PaymentMethod === 'cod' || order.PaymentMethod === 'mixed' || order.PaymentMethod === 'razorpay' ? order.FinalAmount : 0);
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

        const refundAmount = order.WalletAmount + (order.PaymentMethod === 'cod' || order.PaymentMethod === 'mixed' || order.PaymentMethod === 'razorpay' ? order.FinalAmount : 0);
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

const returnItem = async (req, res) => {
    try {
        const userId = req.session.User?._id;
        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(401).json({ success: false, message: 'Unauthorized: Please log in' });
        }

        const orderId = req.params.orderId;
        const { itemIndex, reason } = req.body;

        if (!reason) {
            return res.json({ success: false, message: 'Return reason required' });
        }

        const order = await Order.findOne({ OrderId: orderId, userId });
        if (!order) {
            return res.json({ success: false, message: 'Order not found' });
        }

        if (order.Status !== 'Delivered') {
            return res.json({ success: false, message: 'Cannot return item - order not Delivered' });
        }

        const item = order.OrderedItems[itemIndex];
        if (!item) {
            return res.json({ success: false, message: 'Item not found in order' });
        }

        if (item.ReturnStatus !== 'None') {
            return res.json({ success: false, message: 'Item return already requested or processed' });
        }

        // Update item return status and reason
        order.OrderedItems[itemIndex].ReturnStatus = 'Return Requested';
        order.OrderedItems[itemIndex].ItemReturnReason = reason;
        await order.save();

        res.json({ success: true, message: 'Item return request submitted' });
    } catch (error) {
        console.error('Error in returnItem:', error);
        res.json({ success: false, message: 'Error requesting item return' });
    }
};

const downloadInvoice = async (req, res) => {
    try {
        // Fetch order from database
        const order = await Order.findOne({ OrderId: req.params.orderId })
            .populate('OrderedItems.Product')
            .exec();

        if (!order) {
            return res.status(404).send('Order not found');
        }

        // Don't generate invoice for payment failed orders
        if (order.Status === 'Payment Failed') {
            return res.status(400).send('Cannot generate invoice for failed payments');
        }

        // Create a new PDF document
        const doc = new PDFDocument({
            size: 'A4',
            margin: 50,
            info: {
                Title: `Invoice #${order.OrderId || order._id} from SNEAKKISH`,
                Author: 'SNEAKKISH',
                Subject: `Invoice for Order #${order.OrderId || order._id}`,
                Creator: 'SNEAKKISH E-Commerce'
            }
        });

        // Set response headers to trigger download
        res.setHeader('Content-disposition', `attachment; filename=invoice-${order.OrderId || order._id}.pdf`);
        res.setHeader('Content-type', 'application/pdf');

        // Pipe the PDF to the response
        doc.pipe(res);

        // Company Details
        const companyDetails = {
            name: 'SNEAKKISH',
            address: '123 Fashion Street, Style City, FC 12345',
            email: 'support@sneakkish.com',
            phone: '(123) 456-7890'
        };

        // Header: Company Details
        doc.font('Helvetica-Bold').fontSize(20).text(companyDetails.name, 50, 50);
        doc.font('Helvetica').fontSize(12);
        doc.text(companyDetails.address, 50, 75);
        doc.text(`Email: ${companyDetails.email}`, 50, 90);
        doc.text(`Phone: ${companyDetails.phone}`, 50, 105);

        // Invoice Title and Details
        doc.font('Helvetica-Bold').fontSize(16).text(`Invoice #${order.OrderId || order._id}`, 50, 140);
        doc.font('Helvetica').fontSize(12);
        doc.text(`Date: ${order.InvoiceDate ? new Date(order.InvoiceDate).toISOString().split('T')[0] : 'N/A'}`, 50, 160);
        doc.text(`Status: ${order.Status}`, 50, 175);
        doc.text(`Payment Method: ${order.PaymentMethod || 'N/A'}`, 50, 190);

        // Customer Address
        if (order.Address) {
            doc.font('Helvetica-Bold').fontSize(14).text('Delivery Address', 50, 220);
            doc.font('Helvetica').fontSize(12);
            doc.text(`${order.Address.addressType || ''}`, 50, 240);
            doc.text(`City: ${order.Address.City}`, 50, 255);
            doc.text(`State: ${order.Address.State}`, 50, 270);
            doc.text(`Pincode: ${order.Address.Pincode}`, 50, 285);
        }

        // Ordered Items Table
        doc.font('Helvetica-Bold').fontSize(14).text('Ordered Items', 50, 320);
        const tableTop = 340;
        const descriptionX = 50;
        const sizeX = 250;
        const quantityX = 300;
        const priceX = 350;
        const subtotalX = 400;

        // Table Headers
        doc.font('Helvetica-Bold').fontSize(12);
        doc.text('Product Name', descriptionX, tableTop);
        doc.text('Size', sizeX, tableTop);
        doc.text('Qty', quantityX, tableTop);
        doc.text('Price', priceX, tableTop);
        doc.text('Subtotal', subtotalX, tableTop);

        // Table Header Underline
        doc.moveTo(descriptionX, tableTop + 15).lineTo(550, tableTop + 15).stroke();

        // Table Rows
        let y = tableTop + 30;
        order.OrderedItems.forEach((item) => {
            doc.font('Helvetica').fontSize(10);
            doc.text(item.Product.ProductName || 'Unnamed Product', descriptionX, y, { width: 190 });
            doc.text(item.Size, sizeX, y);
            doc.text(item.Quantity, quantityX, y);
            doc.text(`₹${item.Price.toFixed(2)}`, priceX, y);
            doc.text(`₹${(item.Price * item.Quantity).toFixed(2)}`, subtotalX, y);
            y += 20;
        });

        // Totals Section
        const totalsTop = y + 20;
        doc.font('Helvetica-Bold').fontSize(14).text('Order Summary', 50, totalsTop);
        doc.font('Helvetica').fontSize(12);
        doc.text(`Subtotal: ₹${order.TotalPrice.toFixed(2)}`, 400, totalsTop + 20);
        doc.text(`Tax: ₹${order.Tax.toFixed(2)}`, 400, totalsTop + 35);
        doc.text(`Discount: ₹${order.Discount.toFixed(2)}`, 400, totalsTop + 50);
        doc.text(`Wallet Amount Used: ₹${order.WalletAmount.toFixed(2)}`, 400, totalsTop + 65);
        const finalAmount = Math.max(0, order.TotalPrice + order.Tax - order.Discount - order.WalletAmount);
        doc.font('Helvetica-Bold').fontSize(14).text(`Final Amount: ₹${finalAmount.toFixed(2)}`, 400, totalsTop + 80);

        // Footer
        doc.font('Helvetica').fontSize(10).text('Thank you for shopping with SNEAKKISH!', 50, totalsTop + 120, { align: 'center' });
        doc.text('For any queries, contact us at support@sneakkish.com', 50, totalsTop + 135, { align: 'center' });

        // Finalize the PDF
        doc.end();
    } catch (error) {
        console.error('Error generating invoice:', error);
        res.status(500).send('Error generating invoice');
    }
};

// const handlePaymentFailure = async (req, res) => {
//     try {
//         const { orderId, reason } = req.body;
        
//         if (!orderId) {
//             return res.status(400).json({ success: false, message: 'Order ID is required' });
//         }

//         // Update order status to Payment Failed
//         await Order.updateOne(
//             { OrderId: orderId },
//             {
//                 $set: {
//                     Status: 'Payment Failed',
//                     PaymentFailureReason: reason || 'Transaction could not be completed'
//                 }
//             }
//         );

//         // Return the products to inventory
//         const order = await Order.findOne({ OrderId: orderId });
//         if (order && order.OrderedItems) {
//             for (let item of order.OrderedItems) {
//                 const numericSize = parseInt(item.Size);
//                 await Product.updateOne(
//                     { _id: item.Product, 'Variants.Size': numericSize },
//                     { $inc: { 'Variants.$.Quantity': item.Quantity } }
//                 );
//             }
//         }

//         // If wallet amount was used, refund it
//         if (order && order.WalletAmount > 0) {
//             const userId = order.userId;
//             let wallet = await Wallet.findOne({ userId });
//             if (!wallet) {
//                 wallet = new Wallet({ userId, balance: 0 });
//             }
            
//             wallet.balance += order.WalletAmount;
//             await wallet.save();

//             const transaction = new Transaction({
//                 userId,
//                 type: 'credit',
//                 amount: order.WalletAmount,
//                 description: `Refund for failed payment on order ${orderId}`
//             });
//             await transaction.save();
//         }

//         res.render('order-payment-failed', { orderId });
//     } catch (error) {
//         console.error('Error handling payment failure:', error);
//         res.status(500).json({ success: false, message: 'Error handling payment failure' });
//     }
// };

const handlePaymentFailure = async (req, res) => {
    try {
        const { orderId, reason } = req.body;
        
        if (!orderId) {
            return res.status(400).json({ success: false, message: 'Order ID is required' });
        }

        // Update order status to Payment Failed
        await Order.updateOne(
            { OrderId: orderId },
            {
                $set: {
                    Status: 'Payment Failed',
                    PaymentFailureReason: reason || 'Transaction could not be completed'
                }
            }
        );

        // Return the products to inventory
        const order = await Order.findOne({ OrderId: orderId });
        if (order && order.OrderedItems) {
            for (let item of order.OrderedItems) {
                const numericSize = parseInt(item.Size);
                await Product.updateOne(
                    { _id: item.Product, 'Variants.Size': numericSize },
                    { $inc: { 'Variants.$.Quantity': item.Quantity } }
                );
            }
        }

        // If wallet amount was used, refund it
        if (order && order.WalletAmount > 0) {
            const userId = order.userId;
            let wallet = await Wallet.findOne({ userId });
            if (!wallet) {
                wallet = new Wallet({ userId, balance: 0 });
            }
            
            wallet.balance += order.WalletAmount;
            await wallet.save();

            const transaction = new Transaction({
                userId,
                type: 'credit',
                amount: order.WalletAmount,
                description: `Refund for failed payment on order ${orderId}`
            });
            await transaction.save();
        }

        res.render('order-payment-failed', { 
            orderId,
            user: req.session.User || req.user
        });
    } catch (error) {
        console.error('Error handling payment failure:', error);
        res.status(500).json({ success: false, message: 'Error handling payment failure' });
    }
};

module.exports = {
    getOrders,
    getOrderHistory,
    getOrderDetails,
    cancelOrder,
    returnOrder,
    returnItem,
    downloadInvoice,
    handlePaymentFailure
};