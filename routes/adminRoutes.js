const express=require('express')
const router=express.Router()
const adminController=require('../controller/admin/adminController')
const {userAuth,adminAuth}=require('../middlewares/auth')
const categoryController=require("../controller/admin/categoryController")
const  CustomerController=require('../controller/admin/customerController')
const  brandController=require('../controller/admin/brandController')
const  productController=require('../controller/admin/productController')
const orderController=require('../controller/admin/orderController')
const couponController=require('../controller/admin/couponController')
const salesReportController=require('../controller/admin/salesReportController')
const walletController=require('../controller/admin/walletController')
const multer=require("multer")
const storage=require('../helpers/multer')
const uploads=multer({storage:storage})

//ERROR MANAGEMENT
router.get('/pageError',adminController.pageError)
//LOGIN MANAGEMENT
router.get('/login',adminController.loadLogin)
router.post('/login',adminController.login)
router.get('/',adminAuth,adminController.loadDashboard)
router.get('/logout',adminController.logout)
//CUSTOMER MANAGEMENT
router.get('/users',adminAuth,CustomerController.customerInfo)
router.get('/blockCustomer',adminAuth,CustomerController.customerBlocked)
router.get('/unblockCustomer',adminAuth,CustomerController.customerUnBlocked)
//CATEGORY MANAGEMENT
router.get('/category',adminAuth,categoryController.categoryInfo)
router.post('/addCategory',adminAuth,categoryController.addCategory)
router.post("/addCategoryOffer",adminAuth,categoryController.addCategoryOffer)
router.post("/removeCategoryOffer",adminAuth,categoryController.removeCategoryOffer)
router.get('/listCategory',adminAuth,categoryController.getListCategory)
router.get('/unListCategory',adminAuth,categoryController.getUnListCategory)
router.get('/editCategory',adminAuth,categoryController.getEditCategory)
router.post('/editCategory/:id',adminAuth,categoryController.editCategory)
//BRAND MANGEMENT
router.get('/brands',adminAuth,brandController.getBrandPage)
router.post('/addBrand',adminAuth,uploads.single("image"),brandController.addBrand)
router.get('/checkBrand', brandController.checkBrand);
router.get('/blockBrand',adminAuth,brandController.blockBrand)
router.get('/unBlockBrand',adminAuth,brandController.unBlockBrand)
router.get('/deleteBrand',adminAuth,brandController.deleteBrand)

//PRODUCTS MANAGEMENT
router.get('/addProducts',adminAuth,productController.getProductAddPage)
router.post('/addProducts',adminAuth,uploads.array("images",4),productController.addProduct)
router.get('/products',adminAuth,productController.getAllProducts)
router.post('/addProductOffer',adminAuth,productController.addProductOffer)
router.post('/checkCategoryOffer',adminAuth,productController.checkCategoryOffer)
router.post('/removeProductOffer',adminAuth,productController.removeProductOffer)
router.get('/blockProduct',adminAuth,productController.blockProduct)
router.get('/unBlockProduct',adminAuth,productController.unBlockProduct)
router.get('/editProduct',adminAuth,productController.getEditProduct)
router.post('/editProduct/:id',adminAuth,uploads.array("images",3),productController.editProduct)
router.post('/deleteImage',adminAuth,productController.deleteSingleImage)


// ORDER MANAGEMENT
router.get('/orders', adminAuth, orderController.getOrders);
router.get('/orders/:orderId', adminAuth, orderController.getOrderDetails); 
router.post('/orders/:orderId/status', adminAuth, orderController.updateOrderStatus); 
router.post('/orders/:orderId/return', adminAuth, orderController.handleReturnRequest);
router.post('/orders/:orderId/return-item', adminAuth, orderController.handleItemReturnRequest);
router.get('/orders/paginate', adminAuth, orderController.paginate);



//COUPON MANAGEMENT
router.get('/coupon',adminAuth,couponController.loadCoupon)
router.post('/createCoupon',adminAuth,couponController.createCoupon)
router.get('/editCoupon',adminAuth,couponController.editCoupon)
router.post('/updateCoupon',adminAuth,couponController.updateCoupon)
router.get('/deleteCoupon',adminAuth,couponController.deleteCoupon)

//SALES REPORT MANAGEMENT
router.get('/salesReport',adminAuth,salesReportController.getSalesReport)
router.get('/download-sales-report',adminAuth,salesReportController.downloadSalesReport);

//WALLET MANAGEMENT
router.get('/wallet',adminAuth,walletController.getWallet)
router.get('/walletTransactions/:userId',adminAuth,walletController.getwalletTransactions)


module.exports=router;