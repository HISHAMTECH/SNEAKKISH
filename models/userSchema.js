const mongoose=require('mongoose')
const {Schema}=mongoose


const userSchema= new Schema({
    Name:{
        type:String,
        required:true
    },
    Email:{
        type:String,
        required:true,
        unique:true
    },
    PhoneNumber:{
        type:Number,
        required:false,
        unique:true,
        sparse:true,
        default:null
    },
    googleId:{
        type:String,
        unique:true,

    },  
    Password:{
        type:String,
        required:false,  
    },
    isBlocked:{
        type:Boolean,
        default:false
    },
    isAdmin:{
        type:Boolean,
        default:false
    },
    cart:[{
        type:Schema.Types.ObjectId,
        ref:"Cart"
    }],
    Wallet:{
        type:Number,
        default:0
    },
    Wishlist:[{
        type:Schema.Types.ObjectId,
        ref:"Wishlist"
    }],
     OrderHistory:[{
        type:Schema.Types.ObjectId,
        ref:"Order"
     }],
     CreatedOn:{
        type:Date,
        default:Date.now
     },
     ReferralCode:{
        type:String,
        
     },
     Redeemed:{
        type:Boolean
     },
     RedeemedUsers:[{
        type:Schema.Types.ObjectId,
        ref:"User"
     }],
     SearchHistory:[{
    Category:{
        type:Schema.Types.ObjectId,
        ref:"Category"
    },
    Brand:{
        type:String
    },
    SearchOn:{
        type:Date,
        default:Date.now
    }

     }]


})

const User=mongoose.model("User",userSchema)

module.exports=User;