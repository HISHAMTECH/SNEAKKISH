const User=require('../../models/userSchema')
const Category=require("../../models/CategorySchema")
const Product=require('../../models/productSchema')
const Brand=require('../../models/brandSchema')
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


const loadLogin = async (req, res) => {
    try {
        const message = req.session.loginError;
        req.session.loginError = null;
        if (!req.session.User) {
            const loginError = req.session?.userLoginError;
            req.session.userLoginError = null;
            return res.render('login', { message: loginError });
        } else {
            return res.redirect('/');
        }
    } catch (error) {
        res.redirect('/PageNotFound');
    }
};

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

        return res.render('verify-otp',{
            email:Email

        }); 
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


const verifyOTP = async (req, res) => {
    try {
        const { otp } = req.body;
        console.log('OTP received:', otp);

        // Check if OTP exists in session
        if (!otp || !req.session.userOtp) {
            return res.json({ success: false, message: 'OTP not found or expired' });
        }

        // Verify OTP
        if (otp === req.session.userOtp) {
            const user = req.session.userData;

            if (!user || !user.Email) {
                return res.json({ success: false, message: 'User data or email is missing' });
            }

            // Hash the password
            const passwordHash = await securePassword(user.Password);

            // Check if the user already exists by Email to avoid duplicates
            const existingUser = await User.findOne({ Email: user.Email });
            if (existingUser) {
                return res.json({ success: false, message: 'User with this email already exists' });
            }

            // Create a new user with GoogleId explicitly set to null for non-Google users
            const saveUserData = new User({
                FirstName: user.FirstName,
                LastName: user.LastName,
                Email: user.Email,
                PhoneNumber: user.PhoneNumber,
                Password: passwordHash,
                GoogleId: null, // Explicitly set GoogleId to null for non-Google users
            });

            try {
                await saveUserData.save();
                // Do not set req.session.User here to avoid auto-login
                // Clear session data related to signup
                delete req.session.userOtp;
                delete req.session.userData;
                res.json({ success: true, redirectUrl: "/login" });
            } catch (error) {
                if (error.code === 11000) {
                    console.error("Duplicate key error on GoogleId:", error);
                    return res.status(400).json({ 
                        success: false, 
                        message: "A duplicate key error occurred. Please contact support or try again later." 
                    });
                } else {
                    throw error; // Re-throw other errors for general handling
                }
            }
        } else {
            res.json({ success: false, message: "Invalid OTP. Please try again." });
        }
    } catch (error) {
        console.error("Error Verifying OTP", error);
        res.status(500).json({ success: false, message: "An Error Occurred" });
    }
};



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
            req.session.userLoginError= "Email and password are required"
            // return res.render("login",{ message: "Email and password are required" });
            return res.redirect('/login')
        }
        
        const findUser=await User.findOne({isAdmin:false,Email:Email})
       
        
        if(!findUser){
            req.session.userLoginError= "User not found"
    return res.redirect('/login')
            // return res.render('login',{message:"User not found"})
        }

        if(findUser.isBlocked){
            req.session.userLoginError= "User Blocked By The Admin"
    return res.redirect('/login')
            // return res.render('login',{message:"User Blocked By The Admin"})
        }
const passwordMatch=await bcrypt.compare(Password,findUser.Password)

if(!passwordMatch){
    req.session.userLoginError= "Password Does Not Match"
    return res.redirect('/login')
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
        
        
        const category = await Category.find({isListed:true})
        let productData=await Product.find({isBlocked:false,
            Categorys:{$in:category.map(category=>category._id)}
        })
        // const brandData = await Brand.find({isBlocked:false})

        productData.sort((a,b)=>new Date(b.timestamps)-new Date(a.timestamps))
        productData = productData.slice(0,4)

       

      
        
        if(user){
            const userData= await User.findOne({_id:user._id})
            res.render('home',{
                user:userData,
                products:productData,
                // brands:brandData,
                category:category
            })
        }else{
            return res.render('home',{
                products:productData,
                // brands:brandData,
                category:category
            })
        }
        
      
        
    } catch (error) {
        console.log('Home Page Not Loaded',error);
        res.status(500).send("Server Error")
    }
        
    }

    const logout= async(req,res)=>{
    try {
        req.session.User = null
        delete  req.session.User
        res.redirect('/')
    
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
    logout,
  
    
}