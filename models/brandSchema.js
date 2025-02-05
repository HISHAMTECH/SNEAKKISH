const mongoose=require('mongoose')
const {Schema}=mongoose


const BrandSchema=new mongoose.Schema({
    BrandName:{
        type:String,
        required:false
    },
    BrandImage:{
        type:[String],
        required:true
    },
    isBlocked:{
        type:Boolean,
        default:false
    },
    CreatedAt:{
        type:Date,
        default:Date.nowAC
    }
})

const Brand=mongoose.model("Brand",BrandSchema)

module.exports=Brand;