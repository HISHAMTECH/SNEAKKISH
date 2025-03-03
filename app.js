const express=require('express')
const env=require('dotenv').config()
const path=require('path')
const db=require('./config/db')
const ejs=require('ejs')
const session=require('express-session')
const passport=require('./config/passport')

const userRoute=require("./routes/userRoutes")
const adminRoute=require("./routes/adminRoutes")
const app=express()

db()
//cache management
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    next();
  });

//bodyparser middleware
app.use(express.urlencoded({ extended: true })); 
app.use(express.json()); 

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

app.use(passport.initialize())
app.use(passport.session())

app.use((req,res,next)=>{
    res.set('cache-control','no-store')
    next()
})
app.use('/', userRoute);
app.use('/admin',adminRoute)

//viewengine
app.set("view engine","ejs")
app.set("views",[path.join(__dirname,'views/user'),path.join(__dirname,'views/admin')])
app.use(express.static(path.join(__dirname,'public')))




app.listen(process.env.PORT,()=>{
 console.log("server running");
    
})

module.exports=app

