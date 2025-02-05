const User=require('../../models/userSchema')
const mongoose=require('mongoose')
const bcrypt=require('bcrypt')


const loadLogin= async (req,res)=>{

    try {
        if(req.session.admin){
            return res.redirect('/admin/dashboard')
        }else{
            res.render('admin-login',{message:null})
        }
    } catch (error) {
        res.redirect('/PageError')
    }

}


const login = async (req, res) => {
    try {
        const { Email, Password } = req.body;
        const admin = await User.findOne({ Email, isAdmin: true });

        if (admin) {
            const passwordMatch = await bcrypt.compare(Password, admin.Password);
            if (passwordMatch) {
                req.session.admin = true; 
                return res.redirect("/admin"); 
            } else {
                return res.render("admin-login",{message:"Incorrect Password"}); 
            }
        } else {
            return res.render("admin-login",{message:"Not an Admin"});
        }
    } catch (error) {
        console.error("Login error", error);
        return res.redirect("/pageError"); 
    }
};

const loadDashboard=async(req,res)=>{
    if(req.session.admin){
        try {
            res.render('dashboard')
        } catch (error) {
            
        res.redirect('/PageError')
        
        }
    }
   
}
const pageError=async (req,res)=>{
    res.render("admin-page-404")
}


const logout= async(req,res)=>{
try {
    req.session.destroy((err)=>{
        if(err){
        console.log("Error Destroying Session ",err);
        return res.redirect('/pageError')
        }
        res.redirect('/admin/login')
    })
    
} catch (error) {
    console.log("Unexpected Error During Logout",error);
    res.redirect('/pageError')
}
}

module.exports={
    loadLogin,
    login,
    loadDashboard,
    pageError,
    logout,
    
}