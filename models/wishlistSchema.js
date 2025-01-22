const mongoose=require('mongoose');
const Product = require('./productSchema');
const {Schema}=mongoose


const WishlistSchema=new mongoose.Schema({
    UserId:{
        type:Schema.Types.ObjectId,
        ref:"User",
        required:true
    },
    Products:[{
        ProductId:{
            type:Schema.Types.ObjectId,
            ref:"Product",
            required:true
        },
        AddedOn:{
            type:Date,
            default:Date.now
        }
    }]
    })

const Wishlist=mongoose.model("Wishlist",WishlistSchema)

module.exports=Wishlist;