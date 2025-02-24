const express=require('express')
const env=require('dotenv').config()
const path=require('path')
const db=require('./config/db')
const ejs=require('ejs')
const session=require('express-session')

const userRoute=require("./routes/userRoutes")
const app=express()

db()

//bodyparser middleware
app.use(express.json());
app.use(express.urlencoded({extended:true}))
app.use(session({
    secret:process.env.SESSION_SECRET,
    resave:false,
    saveUninitialized:true,
    cookie:{
        secure:false,
        httpOnly:true,
        maxAge:72*60*60*1000  
    }
    
}))
app.use('/', userRoute);

//viewengine
app.set("view engine","ejs")
app.set("views",[path.join(__dirname,'views/user'),path.join(__dirname,'views/admin')])
app.use(express.static(path.join(__dirname,'public')))




app.listen(process.env.PORT,()=>{
 console.log("server running");
    
})

module.exports=app

