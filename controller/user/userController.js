const User=require('../../models/userSchema')
const nodemailer=require('nodemailer')
const env=require('dotenv').config()




const pageNotFound=async (req,res)=>{
    try {
        res.render("page-404")
    } catch (error) {
        res.redirect('/pageNotFound')
    }

}



const loadHomePage= async (req,res)=>{

    try {
        return res.render("home")

    } catch (error) {
        console.log("Home page not found");
        res.status(500).send("server error")
        
    }
}

const loadLogin= async (req,res)=>{

    try {
        
        return res.render('login')

    } catch (error) {
        console.log('Login Page Not Loaded',error);
        res.status(500).send('Server Error')
        
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
        
        const { FirstName,LastName,Email, Password, ConfirmPassword } = req.body;

        if (Password !== ConfirmPassword) {
            return res.render("signup", { message: "Passwords Do Not Match" });
        }

        const findUser = await User.findOne({ Email });
        if (findUser) {
            return res.render('signup', { message: "User With This Email Already Exists" });
        }

        const otp = generateOtp();
        const emailSent = await sendVerificationEmail(Email, otp);

        if (!emailSent) {
            return res.render('signup', { message: "Failed to Send Verification Email. Please Try Again." });
        }

        //
        req.session.userOtp = otp;
        req.session.userData = {FirstName,LastName,Email,Password};

        console.log("OTP Sent");
        // return res.render('verify-otp'); 
    } catch (error) {
        console.log('Signup Error:', error.message);
        res.redirect('/pageNotFound');
    }
};






module.exports={
    loadHomePage,
    pageNotFound,
    loadLogin,
    loadSignup,
    signUp
}