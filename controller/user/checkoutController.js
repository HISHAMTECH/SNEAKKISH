const mongoose = require('mongoose');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const Order = require('../../models/orderSchema');
const Cart = require('../../models/cartSchema');
const Coupon = require('../../models/couponSchma');
const Wallet = require('../../models/walletSchema');
const Product = require('../../models/productSchema'); // Assuming you have a Product model

// Initialize Razorpay instance
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID, // Set in .env
    key_secret: process.env.RAZORPAY_KEY_SECRET // Set in .env
});

// Render checkout page
const renderCheckout = async (req, res) => {
    try {
        const user = req.session.user || req.user;
        const userId = user._id;
        const cart = await Cart.findOne({ UserId: userId })
            .populate('Items.ProductId');
        const coupons = await Coupon.find({ IsActive: true });
        const wallet = await Wallet.findOne({ UserId: userId });

        if (!cart || cart.Items.length === 0) {
            return res.redirect('/cart');
        }

        const subtotal = cart.Items.reduce((sum, item) => sum + item.TotalPrice, 0);
        const tax = subtotal * 0.1; // Assuming 10% tax
        const discount = 0; // Will be updated if coupon is applied
        const finalTotal = subtotal + tax - discount;

        const userAddress = await User.findById(userId).select('Address');

        res.render('checkout', {
            user,
            userAddress,
            cart,
            coupons,
            wallet,
            total: subtotal,
            tax,
            discount,
            finalTotal
        });
    } catch (error) {
        console.error('Error rendering checkout:', error);
        res.status(500).send('Error loading checkout page');
    }
};

// Validate stock before placing order
const validateStock = async (req, res) => {
    try {
        const userId = req.session.User._id;
        const cart = await Cart.findOne({ UserId: userId }).populate('Items.ProductId');
        console.log("USERID", userId);

        if (!cart || cart.Items.length === 0) {
            return res.json({ success: false, message: 'Cart is empty' });
        }

        for (const item of cart.Items) {
            const product = item.ProductId;
            const size = item.Size.toString(); // Convert to string for consistent comparison
            const quantity = item.Quantity;

            // Find the variant in the product's Variants array that matches the size
            const variant = product.Variants.find(v => v.Size.toString() === size);
            if (!variant || variant.Quantity < quantity) {
                return res.json({
                    success: false,
                    message: `Insufficient stock for ${product.ProductName} (Size: ${size}). Available: ${variant ? variant.Quantity : 0}, Requested: ${quantity}`
                });
            }
        }

        res.json({ success: true, message: 'Stock is sufficient' });
    } catch (error) {
        console.error('Error validating stock:', error);
        res.json({ success: false, message: 'Error validating stock' });
    }
};




// const validateStock = async (req, res) => {
//     try {
//         const userId = req.session.User._id;
//         const cart = await Cart.findOne({ UserId: userId }).populate('Items.ProductId');
//         console.log("USERIF",userId);
        
//         if (!cart || cart.Items.length === 0) {
//             return res.json({ success: false, message: 'Cart is empty' });
//         }

//         for (const item of cart.Items) {
//             const product = item.ProductId;
//             const size = item.Size;
//             const quantity = item.Quantity;

//             // Assuming Product schema has a field `Stock` as an array of objects with `Size` and `Quantity`
//             const sizeStock = product.Stock.find(s => s.Size === size);
//             if (!sizeStock || sizeStock.Quantity < quantity) {
//                 return res.json({
//                     success: false,
//                     message: `Insufficient stock for ${product.ProductName} (Size: ${size}). Available: ${sizeStock ? sizeStock.Quantity : 0}, Requested: ${quantity}`
//                 });
//             }
//         }

//         res.json({ success: true, message: 'Stock is sufficient' });
//     } catch (error) {
//         console.error('Error validating stock:', error);
//         res.json({ success: false, message: 'Error validating stock' });
//     }
// };


// Apply coupon


const applyCoupon = async (req, res) => {
    try {
        const { couponId } = req.body;
        const userId = req.session.User._id;

        const coupon = await Coupon.findById(couponId);
        console.log("coupon",coupon);
        
        // if (!coupon || !coupon.IsActive) {
        //     return res.json({ success: false, message: 'Invalid or inactive coupon' });
        // }

        const cart = await Cart.findOne({ UserId: userId });
        if (!cart) {
            return res.json({ success: false, message: 'Cart not found' });
        }

        const subtotal = cart.Items.reduce((sum, item) => sum + item.TotalPrice, 0);

        if (subtotal < coupon.MinimumPrice) {
            return res.json({ success: false, message: `Minimum purchase of $${coupon.MinimumPrice} required` });
        }

        // Calculate discount as a percentage of subtotal
        const discountPercentage = coupon.OfferPrice; // e.g., 30 for 30%
        const discountAmount = (subtotal * discountPercentage) / 100;
        const finalDiscount = Math.min(discountAmount, subtotal); // Cap discount at subtotal

        // Store the coupon and discount in session
        req.session.appliedCoupon = {
            _id: coupon._id,
            discount: finalDiscount
        };

        res.json({ 
            success: true, 
            message: 'Coupon applied', 
            discount: finalDiscount 
        });
    } catch (error) {
        console.error('Error applying coupon:', error);
        res.json({ success: false, message: 'Error applying coupon' });
    }
};

// Remove coupon
const removeCoupon = async (req, res) => {
    try {
        const { couponId } = req.body;

        if (req.session.appliedCoupon && req.session.appliedCoupon._id.toString() === couponId) {
            // Clear the applied coupon and discount
            req.session.appliedCoupon = null;
            res.json({ 
                success: true, 
                message: 'Coupon removed', 
                discount: 0 
            });
        } else {
            res.json({ success: false, message: 'No coupon to remove' });
        }
    } catch (error) {
        console.error('Error removing coupon:', error);
        res.json({ success: false, message: 'Error removing coupon' });
    }
};

// Create Razorpay order
const createRazorpayOrder = async (req, res) => {
    try {
        const { amount, addressId, walletAmount, couponId } = req.body;
        const userId = req.session.User._id;

        const options = {
            amount: amount, // Amount in paise
            currency: 'INR',
            receipt: `receipt_${Date.now()}`,
            payment_capture: 1
        };

        const razorpayOrder = await razorpay.orders.create(options);

        // Temporarily store order details in session
        req.session.tempOrder = {
            userId,
            addressId,
            walletAmount: parseFloat(walletAmount),
            couponId: couponId || null,
            razorpayOrderId: razorpayOrder.id,
            amount: amount / 100 // Convert back to INR
        };

        res.json({ success: true, order: razorpayOrder });
    } catch (error) {
        console.error('Error creating Razorpay order:', error);
        res.json({ success: false, message: 'Error creating Razorpay order' });
    }
};

// Place order
const placeOrder = async (req, res) => {
    try {
        const userId = req.session.User._id;
        const { addressId, paymentMethod, walletAmount, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

        let finalAmount = parseFloat(req.body['final-total'] || 0);
        const appliedWalletAmount = parseFloat(walletAmount) || 0;
        const coupon = req.session.appliedCoupon;

        // Calculate totals
        const cart = await Cart.findOne({ UserId: userId }).populate('Items.ProductId');
        const subtotal = cart.Items.reduce((sum, item) => sum + item.TotalPrice, 0);
        const tax = subtotal * 0.1;
        let discount = 0;

        if (coupon) {
            if (subtotal >= coupon.MinimumPrice) {
                discount = coupon.OfferPrice > subtotal ? subtotal : coupon.OfferPrice;
            }
        }

        finalAmount = subtotal + tax - discount - appliedWalletAmount;

        // Create order
        const order = new Order({
            UserId: userId,
            AddressId: addressId,
            OrderedItems: cart.Items.map(item => ({
                Product: item.ProductId._id,
                Quantity: item.Quantity,
                Size: item.Size,
                Price: item.Price,
                TotalPrice: item.TotalPrice
            })),
            TotalPrice: subtotal,
            Tax: tax,
            Discount: discount,
            WalletAmount: appliedWalletAmount,
            FinalAmount: finalAmount,
            PaymentMethod: paymentMethod,
            Status: paymentMethod === 'razorpay' ? 'Pending' : 'Placed',
            OrderId: `ORD-${Date.now()}`
        });

        if (paymentMethod === 'razorpay') {
            order.RazorpayOrderId = razorpayOrderId;
            order.RazorpayPaymentId = razorpayPaymentId;
            order.RazorpaySignature = razorpaySignature;
        }

        // Verify Razorpay payment if applicable
        if (paymentMethod === 'razorpay') {
            const generatedSignature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
                .update(`${razorpayOrderId}|${razorpayPaymentId}`)
                .digest('hex');

            if (generatedSignature !== razorpaySignature) {
                order.Status = 'Failed';
                await order.save();
                return res.redirect(`/order-failure/${order.OrderId}`);
            }

            order.Status = 'Placed';
        }

        // Deduct wallet amount if used
        if (appliedWalletAmount > 0) {
            const wallet = await Wallet.findOne({ UserId: userId });
            wallet.balance = appliedWalletAmount;
            await wallet.save();
        }

        // Clear cart and session
        await Cart.findOneAndUpdate({ UserId: userId }, { Items: [] });
        req.session.appliedCoupon = null;

        await order.save();
        
        res.redirect(`/order-success/${order.OrderId}`);
    } catch (error) {
        console.error('Error placing order:', error);
        res.status(500).send('Error placing order');
    }
};

// Retry Razorpay payment
const retryRazorpayPayment = async (req, res) => {
    try {
        const { orderId } = req.body;
        const order = await Order.findOne({ OrderId: orderId });

        if (!order || order.Status !== 'Failed') {
            return res.json({ success: false, message: 'Order not found or not in failed state' });
        }

        const options = {
            amount: order.FinalAmount * 100, // Convert to paise
            currency: 'INR',
            receipt: `receipt_${order.OrderId}`,
            payment_capture: 1
        };

        const razorpayOrder = await razorpay.orders.create(options);
        order.RazorpayOrderId = razorpayOrder.id;
        await order.save();

        res.json({ success: true, order: razorpayOrder });
    } catch (error) {
        console.error('Error retrying payment:', error);
        res.json({ success: false, message: 'Error retrying payment' });
    }
};

// Verify payment (for retry payments)
const verifyPayment = async (req, res) => {
    try {
        const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.query;
        const order = await Order.findOne({ OrderId: orderId });

        if (!order) {
            return res.redirect('/cart');
        }

        const generatedSignature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest('hex');

        if (generatedSignature !== razorpay_signature) {
            order.Status = 'Failed';
            order.RazorpayOrderId = razorpay_order_id;
            order.RazorpayPaymentId = razorpay_payment_id;
            order.RazorpaySignature = razorpay_signature;
            await order.save();
            return res.redirect(`/order-failure/${order.OrderId}`);
        }

        order.Status = 'Placed';
        order.RazorpayOrderId = razorpay_order_id;
        order.RazorpayPaymentId = razorpay_payment_id;
        order.RazorpaySignature = razorpay_signature;
        await order.save();

        res.redirect(`/order-success/${order.OrderId}`);
    } catch (error) {
        console.error('Error verifying payment:', error);
        res.status(500).send('Error verifying payment');
    }
};

const orderFailure = async(req, res) => {
    try {
        res.render('order-failure', { 
            orderId: req.params.orderId,
            user: req.session.User || req.user,
            userAddress: req.session.userAddress 
        });
    } catch (error) {
        console.error('Error in Order payment:', error);
        res.status(500).send('Error verifying payment');
    }
};

const orderSuccess = async(req, res) => {
    try {
        res.render('order-success', { 
            orderId: req.params.orderId,
            user: req.session.User || req.user
        });
    } catch (error) {
        console.error('Error in Success Page:', error);
        res.status(500).send('Error verifying payment');
    }
};

module.exports = {
    renderCheckout,
    validateStock,
    applyCoupon,
    removeCoupon,
    createRazorpayOrder,
    placeOrder,
    retryRazorpayPayment,
    verifyPayment,
    orderFailure,
    orderSuccess
};