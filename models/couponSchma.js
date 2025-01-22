const mongoose=require('mongoose');
const {Schema}=mongoose



const CouponSchema=new mongoose.Schema({
    Name:{
        type:String,
        required:true,
        unique:true
    },
    CreatedOn:{
        type:Date,
        default:Date.now,
        required:true
    },
    ExpiryOn:{
        type:Date,
        required:true
    },
    OfferPrice:{
        type:Number,
        required:true
    },
    MinimumPrice:{
        type:Number,
        required:true
    },
    isListed:{
        type:Boolean,
        default:true
    },
    UserId:[{
        type:mongoose.Schema.Types.ObjectId,
        required:true,
    }],
   
})

const Coupon=mongoose.model("Coupon",CouponSchema)

module.exports=Coupon;