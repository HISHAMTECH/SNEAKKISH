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
    Variants: [{
       
        Size: {
            type: Number,
            required: true,
        },
        Quantity: {
            type: Number,
            default: 1, 
        }
        
    }],

    Colour:{
        type:String,
        required:true
    },
    ProductImage: [{
        type: String // Array of image URLs or paths
    }],
    isBlocked:{
        type:Boolean,
        default:false
    },
    Status: {
        type: String,
        enum: ["Available", "out of stock", "Discontinued"],
        required: true,
        default: "Available",
    },
    timestamps: {
        type: Date,
        default: Date.now
    },
    isOnSale: {
        type: Boolean,
        default: false // For "SALE" badge
    },
    rating: {
        type: Number,
        default: 0, // Rating out of 5 (0-5)
        min: 0,
        max: 5
    },
   

},)

const Product=mongoose.model("Product",productSchema)

module.exports=Product;


