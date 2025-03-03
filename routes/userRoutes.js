const express=require('express')
const router=express.Router()
const {userAuth,adminAuth}=require('../middlewares/auth')
const userController=require('../controller/user/userController')
const productController=require('../controller/user/productController')
const profileController=require('../controller/user/profileController')
const cartController =require('../controller/user/cartController')
const orderController=require('../controller/user/orderController')
const passport = require('passport')






// router.get('/pageNotFound',userController.pageNotFound)
// router.get('/',userController.loadHome)
// router.get('/login',userController.loadLogin)
// router.post('/login',userController.login)
// router.get('/signup',userController.loadSignup)
// router.post('/signup',userController.signUp)
// router.post('/verify-signup-otp',userController.verifyOTP)
// router.post('/resend-signup-otp',userController.resendOtp)
// router.get('/logout',userController.logout)


// //Routes for google oAuth
// router.get('/auth/google',passport.authenticate('google',{scope:['profile','Email']}))
// router.get(
//     '/auth/google/callback',
//     passport.authenticate('google', { failureRedirect: '/signup' }),
//     async (req, res) => {
//         try {
//             req.session.User = { _id: req.user._id }; 
//             res.redirect('/');
//         } catch (error) {
//             console.error('Error in Google callback:', error);
//             res.redirect('/signup');
//         }
//     }
// );
// //change it to controller

// //USER PROFILE MANAGEMENT
// router.get('/userProfile',userAuth,profileController.userProfile)
// router.get('/profile',userAuth,profileController.editProfile)
// router.get('/forgot-password',profileController.getForgetPassword)
// router.post('/forgot-password',profileController.forgotPassword)
// router.post('/verify-otp',profileController.verifyOtp);
// router.post('/resend-otp',profileController.resendOtp);
// router.get('/reset-password',profileController.getResetPassword)
// router.post('/reset-password',profileController.resetPassword)
// router.get('/change-password',userAuth,profileController.changePassword)
// router.post('/change-password',userAuth,profileController.changePasswordValid)
// router.post('/verify-changePass-otp',userAuth,profileController.verifyChangePassOtp) 

// //ADDRESS MANAGEMENT
// router.get('/address',userAuth,profileController.getAddress)
// router.post('/addAddress',userAuth,profileController.addAddress)
// router.get('/editAddress',userAuth,profileController.editAddress)
// router.post('/editAddress',userAuth,profileController.postEditAddress)
// router.get('/deleteAddress',userAuth,profileController.deleteAddress)

// //PRODUCT MANAGEMENT
// router.get('/productDetails',userAuth,productController.productDetails)
// router.get('/product-page',userAuth,productController.productPage)



// module.exports=router

// Existing Routes
router.get('/pageNotFound', userController.pageNotFound);
router.get('/', userController.loadHome);
router.get('/login', userController.loadLogin);
router.post('/login', userController.login);
router.get('/signup', userController.loadSignup);
router.post('/signup', userController.signUp);
router.post('/verify-signup-otp', userController.verifyOTP);
router.post('/resend-signup-otp', userController.resendOtp);
router.get('/logout', userController.logout);

// Google OAuth Routes
router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get(
    '/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/signup' }),
    async (req, res) => {
        try {
            req.session.User = { _id: req.user._id };
            res.redirect('/');
        } catch (error) {
            console.error('Error in Google callback:', error);
            res.redirect('/signup');
        }
    }
);

// User Profile Management
router.get('/userProfile', userAuth, profileController.userProfile);
router.get('/profile', userAuth, profileController.editProfile);
router.get('/forgot-password', profileController.getForgetPassword);
router.post('/forgot-password', profileController.forgotPassword);
router.post('/verify-otp', profileController.verifyOtp);
router.post('/resend-otp', profileController.resendOtp);
router.get('/reset-password', profileController.getResetPassword);
router.post('/reset-password', profileController.resetPassword);
router.get('/change-password', userAuth, profileController.changePassword);
router.post('/change-password', userAuth, profileController.changePasswordValid);
router.post('/verify-changePass-otp', userAuth, profileController.verifyChangePassOtp);

// Address Management
router.get('/address', userAuth, profileController.getAddress);
router.post('/addAddress', userAuth, profileController.addAddress);
router.get('/editAddress', userAuth, profileController.editAddress);
router.post('/editAddress', userAuth, profileController.postEditAddress);
router.get('/deleteAddress', userAuth, profileController.deleteAddress);

// Product Management
router.get('/productDetails', userAuth, productController.productDetails);
router.get('/product-page', userAuth, productController.productPage);


router.get('/cart', userAuth, cartController.getCart);
router.post('/cart/add/:productId', userAuth, cartController.addToCart);
router.post('/cart/increment/:productId', userAuth, cartController.incrementQuantity);
router.post('/cart/decrement/:productId', userAuth, cartController.decrementQuantity);
router.post('/cart/remove/:productId', userAuth, cartController.removeFromCart);
router.get('/checkout', userAuth, cartController.getCheckout);
router.post('/checkout/place-order', userAuth, cartController.placeOrder);
router.get('/order-success',userAuth,cartController.orderSuccess)


// // Order Management Routes (API Endpoints)
router.get('/orders',userAuth,orderController.getOrders);
router.get('/orders/:orderId', userAuth, orderController.getOrderDetail);
router.post('/orders/cancel/:orderId', userAuth, orderController.cancelOrder);
router.post('/orders/return/:orderId', userAuth, orderController.returnOrder);
router.get('/orders/invoice/:orderId', userAuth, orderController.downloadInvoice);

module.exports = router;