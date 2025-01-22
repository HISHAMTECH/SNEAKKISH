const mongoose=require('mongoose');
const {Schema}=mongoose



const BannerSchema=new mongoose.Schema({
    Image:{
        type:String,
        required:true,
    },
    Title:{
        type:String,
        required:true
    },
    Description:{
        type:String,
        required:true
    },
    Link:{
        type:String,
    },
    StartDate:{
        type:Date,
        required:true
    },
    EndDate:{
        type:Date,
        required:true
    }
   
})

const Banner=mongoose.model("Banner",BannerSchema)

module.exports=Banner;