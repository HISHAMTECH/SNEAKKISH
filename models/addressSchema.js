const mongoose=require('mongoose')
const {Schema}=mongoose

const addressSchema=new Schema({
  userId:{
    type:Schema.Types.ObjectId,
    ref:"User",
    require:true
  },
  Address:[{
    addressType:{
        type:String,
        require:true
    },
    Name:{
        type:String,
        required:true
    },
    City:{
        type:String,
        required:true
    },
    Landmark:{
        type:String,
        required:true
    },
    State:{
        type:String,
        required:true
    },
    Pincode:{
        type:Number,
        required:true
    },
    Phone:{
        type:Number,
        required:true
    },
    AltPhone:{
        type:Number,
        required:true
    },
  }]  
})

const Address=mongoose.model("Address",addressSchema)

module.exports=Address;
