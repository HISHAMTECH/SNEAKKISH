const mongoose=require('mongoose')
const env =require("dotenv").config()

const connectDB= async ()=>{
    console.log('db start');
    console.log(process.env.MONGODB_URI);
    
try {
     await mongoose.connect(process.env.MONGODB_URI)
     console.log("DB connected to atlas");
     
} catch (error) {
    console.log("DB connection failed",error.message);
    process.exit(1)
}

console.log('db end');

}

module.exports=connectDB