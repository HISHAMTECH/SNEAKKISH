const express=require('express')
const router=express.Router()
const {userAuth,adminAuth}=require('../middlewares/auth')
const userController=require('../controller/user/userController')
const productController=require('../controller/user/productController')
const profileController=require('../controller/user/profileController')
const cartController =require('../controller/user/cartController')
const orderController=require('../controller/user/orderController')
const couponController=require('../controller/user/couponController')
const wishlistController=require('../controller/user/wishlistController')
const walletController=require('../controller/user/walletController')
const checkoutController=require('../controller/user/checkoutController')
const User=require('../models/userSchema')
const passport = require('passport')



// Existing Routes
// router.get('/pageNotFound', userController.pageNotFound);
router.get('/',userAuth,userController.loadHome);
router.get('/login', userController.loadLogin);
router.post('/login', userController.login);
router.get('/signup', userController.loadSignup);
router.post('/signup', userController.signUp);
router.post('/verify-signup-otp', userController.verifyOTP);
router.post('/resend-signup-otp', userController.resendOtp);
router.get('/logout', userController.logout);

// Google OAuth Routes
router.get('/auth/google', (req, res, next) => {
    if (req.query.referralCode) {
        req.session.referralCode = req.query.referralCode;
    }
    passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});

router.get(
    '/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/login' }), // Changed to /login to match regular login
    async (req, res) => {
        try {
            const userId = req.user._id;
            const user = await User.findById(userId);

            // Check if user exists (should always exist due to passport)
            if (!user) {
                req.session.userLoginError = "User not found";
                return res.redirect('/login');
            }

            // Check if user is blocked (matching regular login logic)
            if (user.isBlocked) {
                req.session.userLoginError = "User Blocked By The Admin";
                req.session.User = null; // Ensure no session is set
                return res.redirect('/login');
            }

            // Handle referral code if provided
            const referralCode = req.session.referralCode;
            if (referralCode && !user.referredBy) {
                const referringUser = await User.findOne({ ReferralCode: referralCode });
                if (referringUser) {
                    user.referredBy = referringUser._id;
                    
                    const referralCoupon = await Coupon.findOne({
                        couponType: 'referral',
                        isListed: true,
                        ExpiryOn: { $gt: new Date() },
                        $or: [
                            { usageLimit: 0 },
                            { $expr: { $lt: ['$timesUsed', '$usageLimit'] } }
                        ]
                    });

                    if (referralCoupon) {
                        referralCoupon.assignedUsers.push(referringUser._id);
                        referralCoupon.timesUsed += 1;
                        await referralCoupon.save();
                    }

                    await user.save();
                }
            }
            delete req.session.referralCode;
            req.session.User = { _id: user._id };
            res.redirect('/');

        } catch (error) {
            console.error('Error in Google callback:', error);
            req.session.userLoginError = "Login Failed Please Try Again";
            res.redirect('/login');
        }
    }
);

//USER PROFILE MANAGEMENT
router.get('/userProfile', userAuth, profileController.userProfile);
router.get('/profile', userAuth, profileController.editProfile);
router.post('/update-profile',userAuth,profileController.updateProfile)
router.get('/forgot-password', profileController.getForgetPassword);
router.post('/forgot-password', profileController.forgotPassword);
router.post('/verify-otp', profileController.verifyOtp);
router.post('/resend-otp', profileController.resendOtp);
router.get('/reset-password', profileController.getResetPassword);
router.post('/reset-password', profileController.resetPassword);
router.get('/change-password', userAuth, profileController.changePassword);
router.post('/change-password', userAuth, profileController.changePasswordValid);
router.post('/verify-changePass-otp', userAuth, profileController.verifyChangePassOtp);

//ADDRESS MANAGEMENT
router.get('/address', userAuth, profileController.getAddress);
router.post('/addAddress', userAuth, profileController.addAddress);
router.get('/editAddress', userAuth, profileController.editAddress);
router.post('/editAddress', userAuth, profileController.postEditAddress);
router.get('/deleteAddress', userAuth, profileController.deleteAddress);

//PRODUCT MANAGEMENT
router.get('/productDetails', userAuth, productController.productDetails);
router.get('/product-page', userAuth, productController.productPage);

//CART MANAGEMENT
router.get('/cart', userAuth, cartController.getCart);
router.post('/cart/add/:productId', userAuth, cartController.addToCart);
router.post('/cart/increment/:productId/ajax', userAuth, cartController.incrementQuantity);
router.post('/cart/decrement/:productId/ajax', userAuth, cartController.decrementQuantity);
router.post('/cart/remove/:productId/ajax', userAuth, cartController.removeFromCart);
router.get('/checkout', userAuth, cartController.getCheckout);
router.post('/checkout/place-order', userAuth, cartController.placeOrder);
router.get('/order-success',userAuth,cartController.orderSuccess)


// ORDER MANAGEMENT
router.get('/orders', userAuth, orderController.getOrders);
router.get('/orders/:orderId', userAuth, orderController.getOrderDetails);
router.post('/orders/cancel/:orderId', userAuth, orderController.cancelOrder);
router.post('/orders/return/:orderId', userAuth, orderController.returnOrder);
router.post('/orders/return-item/:orderId', userAuth, orderController.returnItem);
router.get('/orders/invoice/:orderId', userAuth, orderController.downloadInvoice);

//COUPON MANAGEMENT
router.get('/coupon',userAuth,couponController.loadCoupon)
router.post('/remove-coupon/:couponId',userAuth,couponController.removeCoupon);

//WISHLIST MANAGEMENT
router.get('/Wishlist',userAuth,wishlistController.getWishlist)
router.post('/addToWishlist',userAuth,wishlistController.addToWishlist)
router.get('/removeFromWishlist',userAuth,wishlistController.removeProduct)

//WALLET MANAGEMENT

router.get('/wallet',userAuth,walletController.getWallet)
router.post('/wallet/add-funds', userAuth, walletController.addFunds);
router.get('/wallet/transactions', userAuth, walletController.getAllTransactions);

//CHECKOUT MANAGEMENT

router.get('/checkout', userAuth, checkoutController.renderCheckout);
router.post('/checkout/validate-stock', userAuth, checkoutController.validateStock);
router.post('/checkout/apply-coupon', userAuth, checkoutController.applyCoupon);
router.post('/checkout/remove-coupon', userAuth, checkoutController.removeCoupon);
router.post('/checkout/create-razorpay-order', userAuth, checkoutController.createRazorpayOrder);
router.post('/checkout/place-order', userAuth, checkoutController.placeOrder);
router.post('/checkout/retry-razorpay-payment', userAuth, checkoutController.retryRazorpayPayment);
router.get('/checkout/verify-payment', userAuth, checkoutController.verifyPayment);
router.get('/order-failure/:orderId', userAuth, checkoutController.orderFailure);
router.get('/order-success/:orderId', userAuth, checkoutController.orderSuccess);



module.exports = router;