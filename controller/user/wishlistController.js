const User=require('../../models/userSchema')
const Category=require("../../models/CategorySchema")
const Product=require('../../models/productSchema')
const Brand=require('../../models/brandSchema')
const { resetPassword } = require('./profileController')


const getWishlist = async (req,res)=>{
try {
    const userId = req.session.User
    const user = await User.findOne({_id:userId})
    const products = await Product.find({_id:{$in:user.Wishlist}}).populate('Categorys')


    console.log(products);
    

    res.render('wishlist',{
        user:user,
        wishlist:products,

    })
} catch (error) {
    console.log('Wishlist Page Not Loaded',error);
        res.status(500).send("Server Error")
}
}

const addToWishlist = async(req,res)=>{
try {
    
    const productId = req.body.productId
    const userId = req.session.User
    const user = await User.findById(userId)

    console.log("produid",productId);
    console.log("ui",userId);
    console.log("u",user.Wishlist);

    if(user.Wishlist.includes(productId)){
        return res.status(200).json({status:false,messsage:'Product Already In Wishlist'})
    }

    user.Wishlist.push(productId)
    await user.save()
    return res.status(200).json({status:true,message:"Product Added To Wishlist"})
} catch (error) {
    console.log('Error In Adding To Wishlist',error);
    res.status(500).json({status:false,message:"Server Error"})
}
}

const removeProduct = async (req,res)=>{
    try {
        const productId = req.query.productId
        const userId = req.session.User
        const user = await User.findById(userId)
        const index = user.Wishlist.indexOf(productId)
        user.Wishlist.splice(index,1)

        await user.save()
        return res.redirect('/wishlist')
    } catch (error) {
        console.log('Error In Removing From Wishlist',error);
        return res.status(500).json({status:false,message:"Server Error"})
    }
}

module.exports={
    getWishlist,
    addToWishlist,
    removeProduct
}