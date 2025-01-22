const express=require('express')
const router=express.Router()
const userController=require('../controller/user/userController')

router.get('/pageNotFound',userController.pageNotFound)
router.get('/',userController.loadHomePage)
router.get('/login',userController.loadLogin)
router.get('/signup',userController.loadSignup)




module.exports=router