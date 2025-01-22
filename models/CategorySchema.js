const mongoose=require('mongoose')
const {Schema}=mongoose


const CategorySchema=new mongoose.Schema({
    Name:{
        type:String,
        required:true,
        unique:true
    },
    Description:{
        type:String,
        required:true
    },
    isListed:{
        type:String,
        default:true
    },
    CategoryOffer:{
        type:Number,
        default:0
    },
    CreatedAt:{
        type:Date,
        default:Date.now
    }
})

const Category=mongoose.model("Category",CategorySchema)

module.exports=Category;