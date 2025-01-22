const mongoose=require('mongoose')
const {Schema}=mongoose

const productSchema=new Schema({
    ProductName:{
        type:String,
        required:true
    },
    Description:{
        type:String,
        required:true
    },
    Brand:{
        type:String,
        required:true
    },
    Category:{
        type:Schema.Types.ObjectId,
        ref:"category",
        required:true

    },  
    RegularPrice:{
        type:Number,
        required:true
    },
    SalePrice:{
        type:Number,
        required:true
    },
    ProductOffer:{
        type:Number,
        default:0
    },
    Quantity:[{
        type:Number,
        default:true
    }],
    Colour:{
        type:String,
        required:true
    },
    ProductImage:{
        type:[String],
        required:true
    },
    isBlocked:{
        type:Boolean,
        default:false
    },
    Status:{
        type:String,
        enum:["Available","Out Of Stock","Discontinued"],
        required:true,
        default:"Available"
    },

},{timestamps:true})

const Product=mongoose.Model("Product",productSchema)

module.exports=Product;