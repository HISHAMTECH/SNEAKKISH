const User=require('../../models/userSchema')
const nodemailer=require('nodemailer')
const env=require('dotenv').config()
const bcrypt=require('bcrypt')




const pageNotFound=async (req,res)=>{
    try {
        res.render("page-404")
    } catch (error) {
        res.redirect('/pageNotFound')
    }

}





const loadLogin= async (req,res)=>{

    try {
        if(!req.session.user){
            return res.render('login')
        }else{
            res.redirect('/')
        }
        

    } catch (error) {
        res.redirect('/PageNotFound')
          
    }

}

const loadSignup= async (req,res)=>{
    try {
        return res.render('signup')
    } catch (error) {
        console.log('Signup Page Not Loaded',error);
        res.status(500).send("Server Error")
    }
}

function generateOtp(){
    return Math.floor(100000 + Math.random()*900000).toString()
}

async function sendVerificationEmail(Email, otp) {
    try {
        const transporter = nodemailer.createTransport({
            service: "gmail",
            port: 587,
            secure: false,
            auth: {
                user: process.env.NODEMAILER_EMAIL,
                pass: process.env.NODEMAILER_PASSWORD
            }
        });

        const info = await transporter.sendMail({
            from: process.env.NODEMAILER_EMAIL,
            to: Email,
            subject: "Verify Your Account",
            text: `Your OTP is ${otp}`,
            html: `<b>Your OTP: ${otp}</b>`
        });

        return info.accepted.length > 0; 
    } catch (error) {
        console.log('Error Sending Email:', error.message);
        return false; 
    }
}

const signUp = async (req, res) => {
    try {
        
        const { FirstName,LastName,Email, Password, ConfirmPassword,PhoneNumber} = req.body;

        if (Password !== ConfirmPassword) {
            return res.render("signup", { message: "Passwords Do Not Match" });
        }

        const findUser = await User.findOne({ Email });
        if (findUser) {
            return res.render('signup', { message: "User With This Email Already Exists" });
        }

        const otp = generateOtp();
        console.log("Recieved",otp);
        const emailSent = await sendVerificationEmail(Email, otp);

        if (!emailSent) {
            return res.render('signup', { message: "Failed to Send Verification Email. Please Try Again." });
        }

        //
        req.session.userOtp = otp;
        req.session.userData = {FirstName,LastName,Email,Password,PhoneNumber};
        
        

        console.log("OTP Sent");

        return res.render('verify-otp'); 
    } catch (error) {
        console.log('Signup Error:', error.message);
        res.redirect('/pageNotFound');
    }
};

const securePassword =async (password)=>{
    try {
       
        
        const passwordHash= await bcrypt.hash(password,10)
            return passwordHash;

    } catch (error) {
        console.log("hashing failed",error.message);
        
    }
}


const verifyOTP= async (req,res)=>{
try {
    const {otp}=req.body
    console.log(otp);
    if(otp===req.session.userOtp){
        const user=req.session.userData
        
        
        const  passwordHash=await securePassword(user.Password)

    
        
        const saveUserData =new User({
            FirstName:user.FirstName,
            LastName:user.LastName,
            Email:user.Email,
            PhoneNumber:user.PhoneNumber,
            Password:passwordHash,

        })
        
        await saveUserData.save();
        
        
        req.session.User =saveUserData._id;
       
        res.json({success:true,redirectUrl:"/login"})
        

    }else{
        res.render('verify-otp',{message:"Invalid OTP Please Try Again"})
       
    }
    
    
} catch (error) {
    console.error("Error Verifying OTP",error);
    res.status(500).json({success:false,message:"An Error Occured"})
}

}



const resendOtp = async (req, res) => {
    try {
      // Ensure session and userData exist
      if (!req.session || !req.session.userData) {
        return res.status(400).json({ success: false, message: "User session not found." });
      }
  
      const { Email } = req.session.userData;
  
      // Check if Email exists
      if (!Email) {
        return res.status(400).json({ success: false, message: "Email not found in session data." });
      }
  
      // Generate OTP
      const otp = generateOtp();
  
      console.log("Generated OTP:", otp);
  
      // Store OTP in session
      req.session.userOtp = otp;
  
      // Send verification email
      const emailSent = await sendVerificationEmail(Email, otp);
  
      if (emailSent) {
        console.log("Resend OTP:", otp);
        return res.status(200).json({ success: true, message: "OTP resent successfully." });
      } else {
        return res.status(500).json({ success: false, message: "Failed to resend OTP. Please try again." });
      }
    } catch (error) {
      console.error("Error resending OTP:", error);
      res.status(500).json({ success: false, message: "Internal Server Error. Please try again later." });
    }
  };
  

const login= async(req,res)=>{
    try {
        
        const {Email,Password}=req.body
        
        if (!Email || !Password) {
            return res.render("login",{ message: "Email and password are required" });
        }
        
        const findUser=await User.findOne({isAdmin:false,Email:Email})
       
        
        if(!findUser){
            return res.render('login',{message:"User not found"})
        }

        if(findUser.isBlocked){
            return res.render('login',{message:"User Blocked By The Admin"})
        }
const passwordMatch=await bcrypt.compare(Password,findUser.Password)

if(!passwordMatch){
    return res.render('login',{message:"Password Does Not Match"})
}
       
        // req.session.user=findUser._id
        req.session.User = { _id:findUser._id }
        res.redirect('/')

    } catch (error) {
        console.log("Login Error",error);
        res.render('login',{message:"Login Failed Please Try Again"})
        
    }
}


const loadHome=async (req,res)=>{
    try {

        const user=req.session.User
        if(user){
           
            
            const userData= await User.findOne({_id:user._id})
            console.log(userData);
            
            
            res.render('home',{user:userData})
        }else{
            return res.render('home')
        }
        
      
        
    } catch (error) {
        console.log('Home Page Not Loaded',error);
        res.status(500).send("Server Error")
    }
        
    }

    const logout= async(req,res)=>{
    try {
        req.session.destroy((err)=>{
            if(err){
                console.log("Session Destruction Error",err.message);
                return res.redirect('/PageNotFound')
            }
            return res.redirect('/')
        })
    
    } catch (error) {
        console.log("Logout Error",error.message);
        return res.redirect('/PageNotFound')
        
    }
    }





module.exports={
    pageNotFound,
    loadLogin,
    loadSignup,
    signUp,
    verifyOTP,
    resendOtp,
    login,
    loadHome,
    logout
    
}