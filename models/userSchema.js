const mongoose=require('mongoose')
const {Schema}=mongoose


const userSchema= new Schema({
    FirstName:{
        type:String,
        required:true
    },
    LastName:{
        type:String,
        required:true
    },
    Email:{
        type:String,
        required:false,
        unique:true,
        sparse:true,
        default:null
    },
    PhoneNumber:{
        type:String,
        required:false,
        unique:true,
        sparse:true,
        default:null

    },

    GoogleId:{
        type:String,
        unique:true,
        
    },
      
    Password:{
        type:String,
        required:false,  
    },
    ConfirmPassword:{
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
        // required:true
        
     },
     Redeemed:{
        type:Boolean,
        // default:false
     },
     RedeemedUsers:[{
        type:Schema.Types.ObjectId,
        ref:"User",
        // required:true
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