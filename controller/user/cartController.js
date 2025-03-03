const mongoose = require('mongoose');

const Cart= require('../../models/cartSchema')
const Address=require('../../models/addressSchema')
const Product = require('../../models/productSchema');
const Wishlist = require('../../models/wishlistSchema');
const Order = require('../../models/orderSchema');
const User = require('../../models/userSchema');
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
        // Validate session
        const userId = req.session.User?._id; // Use optional chaining
        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.redirect('/cart?error=Invalid user session');
        }

        // Fetch cart, user, and addresses
        const cart = await Cart.findOne({ UserId: userId }).populate('Items.ProductId');
        const user = await User.findById(userId);
        const userAddress = await Address.findOne({ userId }); // Assuming Address schema exists

        console.log("userId", userId);
        console.log("cart", cart);
        console.log("user", user);
        console.log("userAddress", userAddress);

        // Check cart
        if (!cart || !cart.Items.length) {
            return res.redirect('/cart?error=Cart is empty');
        }

        // Check user
        if (!user) {
            return res.redirect('/cart?error=User not found');
        }

        // Check out-of-stock items
        const outOfStock = cart.Items.some(item => {
            const numericSize = parseInt(item.Size);
            const variant = item.ProductId.Variants.find(v => v.Size === numericSize);
            if (!variant) return true;
            return variant.Quantity < item.Quantity || item.ProductId.isBlocked || item.ProductId.isUnlisted;
        });
        console.log("outOfStock", outOfStock);

        if (outOfStock) {
            return res.redirect('/cart?error=Out of stock items detected');
        }

        // Calculate totals
        let total = 0;
        cart.Items.forEach(item => total += item.TotalPrice);
        const tax = total * 0.1;
        const discount = 0;
        const finalTotal = total + tax - discount;

        // Render checkout with userAddress (adjust EJS accordingly)
        res.render('checkout', { cart, user, total, tax, discount, finalTotal, userAddress });
    } catch (error) {
        console.error('Error in getCheckout:', error);
        res.status(500).send('Error loading checkout');
    }
};

const placeOrder = async (req, res) => {
    try {
        const userId = req.session.User?._id;
        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            console.log("Invalid user session, userId:", userId);
            return res.redirect('/checkout?error=Invalid user session');
        }

        const cart = await Cart.findOne({ UserId: userId }).populate('Items.ProductId');
        const user = await User.findById(userId);
        const userAddress = await Address.findOne({ userId });

        console.log("cart", cart);
        console.log("user", user);
        console.log("userAddress", userAddress);

        if (!cart || !cart.Items.length) {
            return res.redirect('/cart?error=Cart is empty');
        }
        if (!user) {
            return res.redirect('/checkout?error=User not found');
        }
        if (!userAddress || !Array.isArray(userAddress.Address) || userAddress.Address.length === 0) {
            console.log("No addresses found for userId:", userId);
            return res.redirect('/checkout?error=No addresses found');
        }

        const addressId = req.body.addressId;
        console.log("req.body.addressId", addressId, "typeof", typeof addressId);

        if (!addressId || typeof addressId !== 'string') {
            console.log("Invalid addressId:", addressId);
            return res.redirect('/checkout?error=Invalid address ID');
        }

        const selectedAddress = userAddress.Address.find(addr => addr._id.toString() === addressId);
        console.log("userAddress.Address", userAddress.Address);
        console.log("selectedAddress before fallback", selectedAddress);

        if (!selectedAddress) {
            console.log("No matching address found for addressId:", addressId);
            const defaultAddress = userAddress.Address.find(addr => addr.isDefault) || userAddress.Address[0];
            console.log("defaultAddress", defaultAddress);
            if (!defaultAddress) {
                return res.redirect('/checkout?error=No valid address found');
            }
            selectedAddress = defaultAddress;
        }

        console.log("selectedAddress", selectedAddress);
        if (!selectedAddress.addressType || !selectedAddress.City || !selectedAddress.State || !selectedAddress.Pincode) {
            console.log("Invalid address data in selectedAddress:", selectedAddress);
            return res.redirect('/checkout?error=Invalid address data');
        }

        const orderItems = cart.Items.map(item => ({
            Product: item.ProductId._id,
            Quantity: item.Quantity,
            Price: item.Price,
            Size: item.Size
        }));

        let total = 0;
        cart.Items.forEach(item => total += item.TotalPrice);
        const finalAmount = total + (total * 0.1);

        for (let item of cart.Items) {
            const numericSize = parseInt(item.Size);
            await Product.updateOne(
                { _id: item.ProductId._id, 'Variants.Size': numericSize },
                { $inc: { 'Variants.$.Quantity': -item.Quantity } }
            );
        }

        const order = new Order({
            OrderId: `ORD-${uuidv4().slice(0, 8)}`,
            userId: userId,
            OrderedItems: orderItems,
            TotalPrice: total,
            FinalAmount: finalAmount,
            Address: {
                addressType: selectedAddress.addressType || 'N/A',
                City: selectedAddress.City || 'N/A',
                State: selectedAddress.State || 'N/A',
                Pincode: selectedAddress.Pincode || 'N/A',
                _id: selectedAddress._id
            },
            Status: 'Pending',
            InvoiceDate: new Date()
        });
        console.log("order before save", order);
        await order.save();

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
    orderSuccess
};