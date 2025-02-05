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
    Brands:{
        type:String,
        required:true
    },
    Categorys:{
        type:Schema.Types.ObjectId,
        ref:"Category",
        required:true
        // type:String,
        // required:true

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
    Size:{
        type:String,
        enum:[4,5,6,7,8,9,10,11,12,13,14,15]
      },
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

const Product=mongoose.model("Product",productSchema)

module.exports=Product;