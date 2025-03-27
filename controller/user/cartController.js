const mongoose = require('mongoose');

const Cart= require('../../models/cartSchema')
const Address=require('../../models/addressSchema')
const Product = require('../../models/productSchema');
const Wishlist = require('../../models/wishlistSchema');
const Order = require('../../models/orderSchema');
const User = require('../../models/userSchema');
const Coupon=require('../../models/couponSchma')
const Wallet=require('../../models/walletSchema')
const Transaction=require('../../models/walletTransactionSchema')

const { v4: uuidv4 } = require('uuid');

const getCart = async (req, res) => {
    try {
        const cart = await Cart.findOne({ UserId: req.session.User._id }).populate('Items.ProductId');
        res.render('cart', { cart: cart || { Items: [] } });
    } catch (error) {
        res.status(500).send('Error fetching cart');
    }
};


const addToCart = async (req, res) => {
    try {
        if (!req.session.User || !req.session.User._id) {
            return res.json({ success: false, message: 'Please log in to add items to cart' });
        }
        const userId = req.session.User._id;
        const productId = req.params.productId;
        const { quantity, size } = req.body;

        if (!size) {
            return res.json({ success: false, message: 'Please select a size' });
        }
        if (!mongoose.Types.ObjectId.isValid(productId)) {
            return res.json({ success: false, message: 'Invalid product ID' });
        }

        const product = await Product.findById(productId);
        if (!product || product.isBlocked || product.isUnlisted) {
            return res.json({ success: false, message: 'Product unavailable' });
        }

        // Convert size to number since Variants.Size is a number
        const numericSize = parseInt(size);
        const variant = product.Variants.find(v => v.Size === numericSize);
        console.log('size:', size, 'numericSize:', numericSize, 'variant:', variant);

        if (!variant || variant.Quantity <= 0) {
            return res.json({ success: false, message: 'Selected size is out of stock' });
        }

        let cart = await Cart.findOne({ UserId: userId });
        if (!cart) cart = new Cart({ UserId: userId, Items: [] });

        const itemIndex = cart.Items.findIndex(item => 
            item.ProductId.toString() === productId && item.Size === size
        );

        if (itemIndex > -1) {
            const newQuantity = cart.Items[itemIndex].Quantity + parseInt(quantity);
            if (newQuantity > variant.Quantity || newQuantity > 7) {
                return res.json({ success: false, message: 'Quantity limit exceeded (max 7 or stock)' });
            }
            cart.Items[itemIndex].Quantity = newQuantity;
            cart.Items[itemIndex].TotalPrice = newQuantity * cart.Items[itemIndex].Price;
        } else {
            if (parseInt(quantity) > variant.Quantity || parseInt(quantity) > 7) {
                return res.json({ success: false, message: 'Quantity limit exceeded (max 7 or stock)' });
            }
            cart.Items.push({
                ProductId: productId,
                Quantity: parseInt(quantity),
                Price: product.SalePrice || product.price,
                TotalPrice: (product.SalePrice || product.price) * parseInt(quantity),
                Size: size // Store as string to match frontend
            });
        }

        await Wishlist.updateOne({ UserId: userId }, { $pull: { Products: { ProductId: productId } } });
        await cart.save();
        res.json({ success: true, message: 'Product added to cart' });
    } catch (error) {
        console.error('Error in addToCart:', error);
        res.status(500).json({ success: false, message: 'Error adding to cart' });
    }
};



const incrementQuantity = async (req, res) => {
    try {
        const userId = req.session.User._id;
        const productId = req.params.productId;
        const size = req.body.size; // String from form (e.g., "4")

        // Validate inputs
        if (!userId || !mongoose.Types.ObjectId.isValid(productId) || !size) {
            return res.redirect('/cart?error=Invalid request');
        }

        const cart = await Cart.findOne({ UserId: userId });
        const product = await Product.findById(productId);

        // Check if cart and product exist
        if (!cart || !product) {
            return res.redirect('/cart?error=Cart or product not found');
        }

        // Convert size to number for comparison
        const numericSize = parseInt(size);
        console.log('size:', size, 'numericSize:', numericSize);

        // Find the variant with matching size
        const variant = product.Variants.find(v => v.Size === numericSize);
        console.log('variant:', variant);

        // Check if variant exists and has stock
        if (!variant) {
            return res.redirect('/cart?error=Selected size not available');
        }

        const itemIndex = cart.Items.findIndex(item => 
            item.ProductId.toString() === productId && item.Size === size
        );

        if (itemIndex > -1) {
            const newQuantity = cart.Items[itemIndex].Quantity + 1;
            if (newQuantity > variant.Quantity || newQuantity > 7) {
                return res.redirect('/cart?error=Quantity limit exceeded (max 7 or stock)');
            }
            cart.Items[itemIndex].Quantity = newQuantity;
            cart.Items[itemIndex].TotalPrice = newQuantity * cart.Items[itemIndex].Price;
            await cart.save();
        } else {
            // If item not found in cart (unlikely in increment), redirect with error
            return res.redirect('/cart?error=Item not found in cart');
        }

        res.redirect('/cart');
    } catch (error) {
        console.error('Error in incrementQuantity:', error);
        res.status(500).send('Error incrementing quantity');
    }
};



const decrementQuantity = async (req, res) => {
    try {
        const userId = req.session.User._id;
        const productId = req.params.productId;
        const size = req.body.size; // Assuming size is sent in the request
        const cart = await Cart.findOne({ UserId: userId });

        const itemIndex = cart.Items.findIndex(item => 
            item.ProductId.toString() === productId && item.Size === size
        );

        if (itemIndex > -1) {
            if (cart.Items[itemIndex].Quantity > 1) {
                cart.Items[itemIndex].Quantity -= 1;
                cart.Items[itemIndex].TotalPrice = cart.Items[itemIndex].Quantity * cart.Items[itemIndex].Price;
            } else {
                cart.Items.splice(itemIndex, 1);
            }
            await cart.save();
        }
        res.redirect('/cart');
    } catch (error) {
        res.status(500).send('Error decrementing quantity');
    }
};

const removeFromCart = async (req, res) => {
    try {
        const userId = req.session.User._id;
        const productId = req.params.productId;
        const size = req.body.size; // Assuming size is sent in the request
        await Cart.updateOne(
            { UserId: userId },
            { $pull: { Items: { ProductId: productId, Size: size } } }
        );
        res.redirect('/cart');
    } catch (error) {
        res.status(500).send('Error removing item');
    }
};

const getCheckout = async (req, res) => {
    try {
        const userId = req.session.User?._id;
        console.log("user", userId);

        const cart = await Cart.findOne({ UserId: userId }).populate('Items.ProductId');
        const user = await User.findById(userId);
        const userAddress = await Address.findOne({ userId });
        
        const coupons = await Coupon.find({
            $or: [
                { couponType: 'general', isListed: true, ExpiryOn: { $gt: new Date() } },
                { couponType: 'referral', assignedUsers: userId, isListed: true, ExpiryOn: { $gt: new Date() } }
            ]
        });
        
        const wallet = await Wallet.findOne({ userId }) || { balance: 0 };

        if (!cart || !cart.Items.length) {
            return res.redirect('/cart?error=Cart is empty');
        }
        if (!user) {
            return res.redirect('/cart?error=User not found');
        }

        const outOfStock = cart.Items.some(item => {
            const numericSize = parseInt(item.Size);
            const variant = item.ProductId.Variants.find(v => v.Size === numericSize);
            if (!variant) return true;
            return variant.Quantity < item.Quantity || item.ProductId.isBlocked || item.ProductId.isUnlisted;
        });

        if (outOfStock) {
            return res.redirect('/cart?error=Out of stock items detected');
        }

        let total = 0;
        cart.Items.forEach(item => total += item.TotalPrice);
        const tax = total * 0.1;
        let discount = cart.coupon?.discountAmount || 0;
        const finalTotal = total + tax - discount;

        res.render('checkout', { 
            cart, 
            user, 
            total, 
            tax, 
            discount, 
            finalTotal, 
            userAddress, 
            coupons, 
            wallet 
        });
    } catch (error) {
        console.error('Error in getCheckout:', error);
        res.status(500).send('Error loading checkout');
    }
};


// const placeOrder = async (req, res) => {
//     try {
//         const userId = req.session.User?._id;
      
//         const cart = await Cart.findOne({ UserId: userId }).populate('Items.ProductId');
//         const user = await User.findById(userId);
//         const userAddress = await Address.findOne({ userId });
//         const wallet = await Wallet.findOne({ userId }) || { balance: 0 };

//         if (!cart || !cart.Items.length) {
//             return res.redirect('/cart?error=Cart is empty');
//         }
//         if (!user) {
//             return res.redirect('/checkout?error=User not found');
//         }
//         if (!userAddress || !Array.isArray(userAddress.Address) || userAddress.Address.length === 0) {
//             return res.redirect('/checkout?error=No addresses found');
//         }

//         const { addressId, paymentMethod, walletAmount: walletAmountStr, couponId } = req.body;
//         const walletAmount = parseFloat(walletAmountStr) || 0;

//         const selectedAddress = userAddress.Address.find(addr => addr._id.toString() === addressId) || 
//                                userAddress.Address.find(addr => addr.isDefault) || 
//                                userAddress.Address[0];

//         if (!selectedAddress) {
//             return res.redirect('/checkout?error=No valid address found');
//         }

//         let total = 0;
//         cart.Items.forEach(item => total += item.TotalPrice);
//         const tax = total * 0.1;
//         let discount = 0;

//         if (couponId) {
//             const coupon = await Coupon.findById(couponId);
//             if (coupon && total >= coupon.MinimumPrice) {
//                 discount = total *(coupon.OfferPrice/100)
//             }
//         }

//         const finalTotalBeforeWallet = total + tax - discount;
//         let finalAmount = finalTotalBeforeWallet;
//         let effectiveWalletAmount = 0;

//         // Generate OrderId once at the start
//         const orderId = `ORD-${uuidv4().slice(0, 8)}`;

//         if (paymentMethod === 'wallet') {
//             if (walletAmount <= 0) {
//                 return res.redirect('/checkout?error=Invalid wallet amount');
//             }
//             if (walletAmount > wallet.balance) {
//                 return res.redirect('/checkout?error=Insufficient wallet balance');
//             }
//             effectiveWalletAmount = Math.min(walletAmount, finalTotalBeforeWallet);
//             finalAmount = finalTotalBeforeWallet - effectiveWalletAmount;

//             // Update wallet balance
//             wallet.balance -= effectiveWalletAmount;
//             await wallet.save();

//             // Create wallet transaction using the same OrderId
//             const transaction = new Transaction({
//                 userId,
//                 type: 'debit',
//                 amount: effectiveWalletAmount,
//                 description: `Payment for order ${orderId}`
//             });
//             await transaction.save();
//         }

//         const orderItems = cart.Items.map(item => ({
//             Product: item.ProductId._id,
//             Quantity: item.Quantity,
//             Price: item.Price,
//             Size: item.Size
//         }));

//         for (let item of cart.Items) {
//             const numericSize = parseInt(item.Size);
//             await Product.updateOne(
//                 { _id: item.ProductId._id, 'Variants.Size': numericSize },
//                 { $inc: { 'Variants.$.Quantity': -item.Quantity } }
//             );
//         }

//         // Create the order with the pre-generated OrderId
//         const order = new Order({
//             OrderId: orderId, // Use the pre-generated OrderId
//             userId,
//             OrderedItems: orderItems,
//             TotalPrice: total,
//             Tax: tax,
//             Discount: discount,
//             FinalAmount: finalAmount,
//             Address: {
//                 addressType: selectedAddress.addressType || 'N/A',
//                 City: selectedAddress.City || 'N/A',
//                 State: selectedAddress.State || 'N/A',
//                 Pincode: selectedAddress.Pincode || 'N/A',
//                 _id: selectedAddress._id
//             },
//             Status: 'Pending',
//             InvoiceDate: new Date(),
//             WalletAmount: effectiveWalletAmount,
//             PaymentMethod: paymentMethod === 'wallet' && finalAmount > 0 ? 'mixed' : paymentMethod
//         });

//         await order.save();
//         await Cart.deleteOne({ UserId: userId });

//         res.redirect('/order-success');
//     } catch (error) {
//         console.error('Error in placeOrder:', error);
//         res.status(500).send('Error placing order');
//     }
// };

const placeOrder = async (req, res) => {
    try {
        const userId = req.session.User?._id;
      
        const cart = await Cart.findOne({ UserId: userId }).populate('Items.ProductId');
        const user = await User.findById(userId);
        const userAddress = await Address.findOne({ userId });
        const wallet = await Wallet.findOne({ userId }) || { balance: 0 };

        if (!cart || !cart.Items.length) {
            return res.redirect('/cart?error=Cart is empty');
        }
        if (!user) {
            return res.redirect('/checkout?error=User not found');
        }
        if (!userAddress || !Array.isArray(userAddress.Address) || userAddress.Address.length === 0) {
            return res.redirect('/checkout?error=No addresses found');
        }

        const { addressId, paymentMethod, walletAmount: walletAmountStr, couponId } = req.body;
        const walletAmount = parseFloat(walletAmountStr) || 0;

        const selectedAddress = userAddress.Address.find(addr => addr._id.toString() === addressId) || 
                               userAddress.Address.find(addr => addr.isDefault) || 
                               userAddress.Address[0];

        if (!selectedAddress) {
            return res.redirect('/checkout?error=No valid address found');
        }

        let total = 0;
        cart.Items.forEach(item => total += item.TotalPrice);
        const tax = total * 0.1;
        let discount = 0;

        if (couponId) {
            const coupon = await Coupon.findById(couponId);
            if (coupon && total >= coupon.MinimumPrice) {
                discount = total * (coupon.OfferPrice / 100);
            }
        }
        console.log("Calculated Discount in placeOrder:", discount); // Log the calculated discount

        const finalTotalBeforeWallet = total + tax - discount;
        let finalAmount = finalTotalBeforeWallet;
        let effectiveWalletAmount = 0;

        // Generate OrderId once at the start
        const orderId = `ORD-${uuidv4().slice(0, 8)}`;

        if (paymentMethod === 'wallet') {
            if (walletAmount <= 0) {
                return res.redirect('/checkout?error=Invalid wallet amount');
            }
            if (walletAmount > wallet.balance) {
                return res.redirect('/checkout?error=Insufficient wallet balance');
            }
            effectiveWalletAmount = Math.min(walletAmount, finalTotalBeforeWallet);
            finalAmount = finalTotalBeforeWallet - effectiveWalletAmount;

            // Update wallet balance
            wallet.balance -= effectiveWalletAmount;
            await wallet.save();

            // Create wallet transaction using the same OrderId
            const transaction = new Transaction({
                userId,
                type: 'debit',
                amount: effectiveWalletAmount,
                description: `Payment for order ${orderId}`
            });
            await transaction.save();
        }

        const orderItems = cart.Items.map(item => ({
            Product: item.ProductId._id,
            Quantity: item.Quantity,
            Price: item.Price,
            Size: item.Size
        }));

        for (let item of cart.Items) {
            const numericSize = parseInt(item.Size);
            await Product.updateOne(
                { _id: item.ProductId._id, 'Variants.Size': numericSize },
                { $inc: { 'Variants.$.Quantity': -item.Quantity } }
            );
        }

        // Create the order with the pre-generated OrderId
        const order = new Order({
            OrderId: orderId,
            userId,
            OrderedItems: orderItems,
            TotalPrice: total,
            Tax: tax,
            Discount: discount,
            FinalAmount: finalAmount,
            Address: {
                addressType: selectedAddress.addressType || 'N/A',
                City: selectedAddress.City || 'N/A',
                State: selectedAddress.State || 'N/A',
                Pincode: selectedAddress.Pincode || 'N/A',
                _id: selectedAddress._id
            },
            Status: 'Pending',
            InvoiceDate: new Date(),
            WalletAmount: effectiveWalletAmount,
            PaymentMethod: paymentMethod === 'wallet' && finalAmount > 0 ? 'mixed' : paymentMethod
        });

        await order.save();
        console.log("Saved Order Discount in placeOrder:", order.Discount); // Log the saved discount

        await Cart.deleteOne({ UserId: userId });

        res.redirect('/order-success');
    } catch (error) {
        console.error('Error in placeOrder:', error);
        res.status(500).send('Error placing order');
    }
};

const orderSuccess = async (req,res)=>{
    try {
        res.render('order-success')
    } catch (error) {

        console.error('Error in Rendering Order Success Page:', error);
        res.status(500).send('Error placing order');
    }
    }

    


module.exports = {
    getCart,
    addToCart,
    incrementQuantity,
    decrementQuantity,
    removeFromCart,
    getCheckout,
    placeOrder,
    orderSuccess,
    
};