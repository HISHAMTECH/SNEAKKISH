const mongoose=require('mongoose');
const {Schema}=mongoose
const{v4:uuidv4}=require('uuid')


const OrderSchema=new mongoose.Schema({
    OrderId:{
        type:String,
        default:()=>uuidv4()
    },
    OrderedItems:[{
        Product:{
            type:Schema.Types.ObjectId,
            ref:"Product",
            required:true
        },
        Quantity:{
             type:Number,
             required:true
        },
        Price:{
            type:Number,
            default:0
        }
        
    }],
    TotalPrice:{
        type:Number,
        required:true
    },
    Discount:{
        type:String,
        default:0
    },
    FinalAmount:{
        type:Number,
        required:true
    },
    Address:{
        type:Schema.Types.ObjectId,
        ref:"User",
        required:true
    },
    InvoiceDate:{
        type:Date,
    },
    Status:{
        type:String,
        required:true,
        enum:['Pending','Processing','Shipped','Delivered','Cancelled','Return Request','Returned']
    },
    CreatedOn:{
        type:Date,
        default:Date.now,
        required:true
    },
    CouponApplied:{
        type:Boolean,
        default:false
    }
    
})

const Order=mongoose.model("Order",OrderSchema)

module.exports=Order;