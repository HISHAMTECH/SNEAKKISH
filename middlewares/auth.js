const User=require('../models/userSchema')

const userAuth=(req,res,next)=>{
    if(req.session.User){
        console.log(req.session.User);
        
        next()
    }
    else{
        res.redirect('/login')
    }
}


const adminAuth=(req,res,next)=>{
    if(req.session.admin){
        next()
    }
    else{
        res.redirect('/admin/login')
    }
}

module.exports={
    userAuth,
    adminAuth
}