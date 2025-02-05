const express=require('express')
const router=express.Router()
const userController=require('../controller/user/userController')
const passport = require('passport')





router.get('/pageNotFound',userController.pageNotFound)
router.get('/',userController.loadHome)
router.get('/login',userController.loadLogin)
router.post('/login',userController.login)
router.get('/signup',userController.loadSignup)
router.post('/signup',userController.signUp)
router.post('/verify-otp',userController.verifyOTP)
router.post('/resend-otp',userController.resendOtp)
router.get('/logout',userController.logout)


//Routes for google oAuth
router.get('/auth/google',passport.authenticate('google',{scope:['profile','Email']}))
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





module.exports=router