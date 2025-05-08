const User=require('../../models/userSchema')
const Category=require("../../models/CategorySchema")
const Product=require('../../models/productSchema')
const Brand=require('../../models/brandSchema')
const Coupon=require('../../models/couponSchma')
const nodemailer=require('nodemailer')
const env=require('dotenv').config()
const bcrypt=require('bcrypt')

function generateReferralCode(baseString, length = 8) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'; // Characters to use in the code
    let referralCode = '';

    // Add part of the baseString to ensure uniqueness
    for (let i = 0; i < baseString.length && i < length; i++) {
        const char = baseString[i].toUpperCase();
        if (characters.includes(char)) {
            referralCode += char;
        }
    }

    // Add random characters to reach the desired length
    while (referralCode.length < length) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        referralCode += characters[randomIndex];
    }

    return referralCode;
}




// const pageNotFound=async (req,res)=>{
//     try {
//         res.render("page-404")
//     } catch (error) {
//         res.redirect('/pageNotFound')
//     }

// }


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
        const { FirstName, LastName, Email, Password, ConfirmPassword, PhoneNumber, ReferralCode } = req.body;

        if (Password !== ConfirmPassword) {
            return res.render("signup", { message: "Passwords Do Not Match" });
        }

        const findUser = await User.findOne({ Email });
        if (findUser) {
            return res.render('signup', { message: "User With This Email Already Exists" });
        }

        let referringUser = null;
        if (ReferralCode) {
            referringUser = await User.findOne({ ReferralCode });
            if (!referringUser) {
                return res.render('signup', { message: "Invalid Referral Code" });
            }

            // Find an available referral coupon
            const referralCoupon = await Coupon.findOne({
                couponType: 'referral',
                isListed: true,
                ExpiryOn: { $gt: new Date() },  // Not expired
                $or: [
                    { usageLimit: 0 },  // Unlimited uses
                    { $expr: { $lt: ['$timesUsed', '$usageLimit'] } }  // Uses remaining
                ]
            });

            if (referralCoupon) {
                referralCoupon.assignedUsers.push(referringUser._id);
                referralCoupon.timesUsed += 1;
                await referralCoupon.save();
            } else {
                console.log('No available referral coupons found');
                // You might want to notify the admin or proceed without assigning a coupon
            }
        }

        const otp = generateOtp();
        console.log("Received OTP:", otp);
        const emailSent = await sendVerificationEmail(Email, otp);

        if (!emailSent) {
            return res.render('signup', { message: "Failed to Send Verification Email. Please Try Again." });
        }

        const newReferralCode = generateReferralCode();
        req.session.userOtp = otp;
        req.session.userData = { 
            FirstName, 
            LastName, 
            Email, 
            Password, 
            PhoneNumber, 
            ReferralCode: newReferralCode,
            referredBy: referringUser?._id
        };

        console.log("OTP Sent");
        return res.render('verify-otp', { email: Email });
    } catch (error) {
        console.log('Signup Error:', error.message);
        res.redirect('/pageNotFound');
    }
};

function generateReferralCode() {
    return 'REF-' + Math.random().toString(36).substring(2, 8).toUpperCase();
}

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

            // Generate a unique referral code for the new user
            const referralCode = generateReferralCode(user.Email); // Use the user's email as a base
            console.log("refer",referralCode);
            
            // Create a new user with GoogleId explicitly set to null for non-Google users
            const saveUserData = new User({
                FirstName: user.FirstName,
                LastName: user.LastName,
                Email: user.Email,
                PhoneNumber: user.PhoneNumber,
                Password: passwordHash,
                GoogleId: null, // Explicitly set GoogleId to null for non-Google users
                ReferralCode: referralCode, // Add the generated referral code
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

// const loadHome = async (req, res) => {
//     try {
//         const user = req.session.User;

//         // Fetch listed categories
//         const category = await Category.find({ isListed: true });

//         // Fetch products and populate the Categorys field
//         let productData = await Product.find({
//             isBlocked: false,
//             Categorys: { $in: category.map(category => category._id) }
//         })
//         .populate('Categorys'); 

        
//         productData.sort((a, b) => new Date(b.timestamps) - new Date(a.timestamps));
//         newArrivals = productData.slice(0, 6);

//         console.log(productData);

//         offerProducts=await Product.find({ProductOffer: { $gt: 0 }})
//         offerprice=offerProducts.SalePrice-(offerProducts.ProductOffer/100)
//         console.log(offerProducts);
//         console.log(offerProducts.SalePrice);
//         console.log(offerprice);
        



//         // Render the page based on whether the user is logged in
//         if (user) {
//             const userData = await User.findOne({ _id: user._id });
//             res.render('home', {
//                 user: userData,
//                 products: newArrivals,
//                 product:offerProducts,
//                 category: category
//             });
//         } else {
//             return res.render('home', {
//                 products: newArrivals,
//                 product:offerProducts,
//                 category: category
//             });
//         }

//     } catch (error) {
//         console.log('Home Page Not Loaded', error);
//         res.status(500).send("Server Error");
//     }
// };

// const loadHome = async (req, res) => {
//     try {
//         const user = req.session.User;

       
//         const category = await Category.find({ isListed: true });

        
//         let productData = await Product.find({
//             isBlocked: false,
//             Categorys: { $in: category.map(category => category._id) }
//         }).populate('Categorys');

        
//         productData.sort((a, b) => new Date(b.timestamps) - new Date(a.timestamps));

        
//         const roundToNearest5or10 = (num) => {
//             const integerPart = Math.floor(num);
//             const decimalPart = num - integerPart;
//             if (decimalPart > 0.75) {
//                 return Math.ceil(num / 10) * 10; 
//             } else {
//                 return Math.round(num / 5) * 5; 
//             }
//         };

        
//         let newArrivals = productData
//             .filter(product => product.ProductOffer <= 0) 
//             .slice(0, 6) 
//             .map(product => {
//                 const displayPrice = roundToNearest5or10(product.SalePrice); 
//                 return {
//                     ...product.toObject(),
//                     displayPrice 
//                 };
//             });

       
//         const offerProducts = await Product.find({ ProductOffer: { $gt: 0 } }).populate('Categorys');

        
//         const offerProductsWithPrice = offerProducts.map(product => {
//             const discount = (product.ProductOffer / 100) * product.SalePrice;
//             const offerPriceRaw = product.SalePrice - discount; 
//             const offerPrice = roundToNearest5or10(offerPriceRaw); 
//             return {
//                 ...product.toObject(), // Convert Mongoose document to plain object
//                 offerPrice 
//             };
//         });

//         console.log(newArrivals); 
//         console.log(offerProductsWithPrice);

       
//         if (user) {
//             const userData = await User.findOne({ _id: user._id });
//             res.render('home', {
//                 user: userData,
//                 products: newArrivals, 
//                 product: offerProductsWithPrice, 
//                 category: category
//             });
//         } else {
//             return res.render('home', {
//                 products: newArrivals, 
//                 product: offerProductsWithPrice, 
//                 category: category
//             });
//         }

//     } catch (error) {
//         console.log('Home Page Not Loaded', error);
//         res.status(500).send("Server Error");
//     }
// };

const loadHome = async (req, res) => {
    try {
        const user = req.session.User;

        // Fetch categories that are listed
        const category = await Category.find({ isListed: true });

        // Fetch products that are not blocked and belong to listed categories
        let productData = await Product.find({
            isBlocked: false,
            Categorys: { $in: category.map(category => category._id) }
        }).populate('Categorys');

        // Sort products by timestamp (newest first)
        productData.sort((a, b) => new Date(b.timestamps) - new Date(a.timestamps));

        // Function to round prices to nearest 5 or 10
        const roundToNearest5or10 = (num) => {
            const integerPart = Math.floor(num);
            const decimalPart = num - integerPart;
            if (decimalPart > 0.75) {
                return Math.ceil(num / 10) * 10; 
            } else {
                return Math.round(num / 5) * 5; 
            }
        };

        // New Arrivals (products with no offers from either product or category)
        let newArrivals = productData
            .filter(product => {
                const productOffer = product.ProductOffer || 0;
                const categoryOffer = product.Categorys?.CategoryOffer || 0;
                return productOffer <= 0 && categoryOffer <= 0; // Exclude if any offer exists
            })
            .slice(0, 6)
            .map(product => {
                const displayPrice = roundToNearest5or10(product.SalePrice); 
                return {
                    ...product.toObject(),
                    displayPrice 
                };
            });

        // Fetch all products and populate their categories
        const allProducts = await Product.find({}).populate('Categorys');

        // Filter products with offers and calculate the higher offer (ProductOffer vs CategoryOffer)
        const offerProductsWithPrice = allProducts
            .filter(product => {
                const categoryOffer = product.Categorys?.CategoryOffer || 0;
                const productOffer = product.ProductOffer || 0;
                return Math.max(categoryOffer, productOffer) > 0; // Include products with any offer
            })
            .map(product => {
                const categoryOffer = product.Categorys?.CategoryOffer || 0;
                const productOffer = product.ProductOffer || 0;
                const highestOffer = Math.max(categoryOffer, productOffer); // Choose the higher offer
                const discount = (highestOffer / 100) * product.SalePrice;
                const offerPriceRaw = product.SalePrice - discount;
                const offerPrice = roundToNearest5or10(offerPriceRaw);
                return {
                    ...product.toObject(),
                    offerPrice,
                    appliedOffer: highestOffer // Store the applied offer percentage
                };
            });
            console.log("pro",productData)
        console.log("BEW",newArrivals); 
        // console.log(offerProductsWithPrice);

        // Render the home page based on user session
        if (user) {
            const userData = await User.findOne({ _id: user._id });
            res.render('home', {
                user: userData,
                products: newArrivals, 
                product: offerProductsWithPrice, 
                category: category
            });
        } else {
            return res.render('home', {
                products: newArrivals, 
                product: offerProductsWithPrice, 
                category: category
            });
        }

    } catch (error) {
        console.log('Home Page Not Loaded', error);
        res.status(500).send("Server Error");
    }
};

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
    // pageNotFound,
    loadLogin,
    loadSignup,
    signUp,
    verifyOTP,
    resendOtp,
    login,
    loadHome,
    logout,
  
    
}