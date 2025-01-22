const mongoose=require('mongoose');
const {Schema}=mongoose


const CartSchema=new mongoose.Schema({
    UserId:{
        type:Schema.Types.ObjectId,
        ref:"User",
        required:true
    },
    Items:[{
        ProductId:{
            type:Schema.Types.ObjectId,
            ref:"Product",
            required:true
        },
        Quantity:{
             type:Number,
             default:1
        },
        Price:{
            type:Number,
            required:true
        },
        TotalPrice:{
            type:Number,
            required:true
        },
        Status:{
            type:String,
            default:"palced"
        },
        CancellationReason:{
            type:String,
            default:"none"
        }
    }],
    
})

const Cart=mongoose.model("Cart",CartSchema)

module.exports=Brand;