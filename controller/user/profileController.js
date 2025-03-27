const User=require('../../models/userSchema')
const Address=require('../../models/addressSchema')
const Product=require('../../models/productSchema')
const nodemailer=require('nodemailer')
const env=require('dotenv').config()
const bcrypt=require('bcrypt')



function generateOtp(){
    return Math.floor(100000 + Math.random()*900000).toString()
}

const transporter = nodemailer.createTransport({
    service: 'gmail', // Use your email service (e.g., Gmail, Outlook)
    auth: {
        user: process.env.NODEMAILER_EMAIL,
        pass: process.env.NODEMAILER_PASSWORD
    }
});




const userProfile = async (req,res)=>{
try {
        const userId = req.session.User 
        const userData = await User.findById(userId)
        const addressData = await Address.findOne({userId:userId})

        
        res.render('profile',{
            user:userData,
            address:addressData
        })

} catch (error) {
    console.error("Error For Retrieve Profile Data",error);
    res.redirect("/pageNotFound")
    
}

}


const editProfile = async (req,res)=>{
    try {
        
        const userId = req.session.User 
        const userData = await User.findById(userId)

        res.render('edit-profile',{
            user:userData
        })



    } catch (error) {
        console.error("Error For Loading Edit Profile ",error);
        res.redirect("/pageNotFound")
    }
}

const getAddress = async (req, res) => {
    try {
        const userId = req.session.User?._id || req.session.User;
        if (!userId) {
            return res.redirect('/login'); 
        }

        
        const userAddress = await Address.findOne({ userId });
        

        
        res.render('address', { userAddress });
    } catch (error) {
        console.error("Error loading address page:", error);
        res.redirect('/pageNotFound');
    }
};

const addAddress = async (req, res) => {
    try {

      const userId = req.session.User?._id || req.session.User;
      if (!userId) {
        throw new Error('User not authenticated');
      }
  
      const userData = await User.findById(userId);
      if (!userData) {
        throw new Error('User not found');
      }
  
      const {
        addressType,
        Name,
        City,
        Landmark,
        State,
        Pincode,
        Phone,
        AltPhone,
        isDefault
      } = req.body;
  
    
      const pincodeNum = Number(Pincode);
      const phoneNum = Number(Phone);
      const altPhoneNum = AltPhone ? Number(AltPhone) : null;
  
     
      if (!addressType || !Name || !City || !State || !Pincode || !Phone) {
        throw new Error('Missing required address fields');
      }
  
   
      if (isNaN(pincodeNum) || isNaN(phoneNum) || (AltPhone && isNaN(altPhoneNum))) {
        throw new Error('Pincode, Phone, and AltPhone must be valid numbers');
      }
  
      const userAddress = await Address.findOne({ userId });
  
      if (!userAddress) {
       
        const newAddress = new Address({
          userId,
          Address: [{ 
            addressType,
            Name,
            City,
            Landmark: Landmark || '',
            State,
            Pincode: pincodeNum,
            Phone: phoneNum,
            AltPhone: altPhoneNum || null,
            isDefault: isDefault === 'on' || isDefault === true
          }]
        });
        const savedAddress = await newAddress.save();
        
      } else {
      
        userAddress.Address.push({ 
          addressType,
          Name,
          City,
          Landmark: Landmark || '',
          State,
          Pincode: pincodeNum,
          Phone: phoneNum,
          AltPhone: altPhoneNum || null,
          isDefault: isDefault === 'on' || isDefault === true
        });
        const updatedAddress = await userAddress.save();
        
      }
  
      if (req.xhr) {
        return res.json({ success: true, message: 'Address saved successfully!' });
      }
      return res.redirect('/address');
  
    } catch (error) {
      console.error('Error Adding Address:', error.message, error.stack);
  
      if (req.xhr) {
        return res.status(500).json({
          success: false,
          message: 'Failed to save address',
          error: error.message
        });
      }
      return res.redirect('/pageNotFound');
    }
  };


  const editAddress = async (req, res) => {
    try {
        const addressId = req.query.id;
        const userId = req.session.User?._id || req.session.User;
        

        if (!addressId || !userId) {
            return res.status(404).json({ success: false, message: 'Address not found' });
        }

        const currAddress = await Address.findOne({ userId });

        if (!currAddress) {
            return res.status(404).json({ success: false, message: 'Address not found' });
        }

        const addressData = currAddress.Address.find((item) => {
            return item._id?.toString() === addressId.toString();
        });

        if (!addressData) {
            return res.status(404).json({ success: false, message: 'Address not found' });
        }

       
        res.json({ success: true, address: addressData, user: userId });
        
    } catch (error) {
        console.error("Error In Edit Address", error);
        res.status(500).json({ success: false, message: 'Error retrieving address', error: error.message });
    }
};

const postEditAddress = async (req, res) => {
    try {
        const data = req.body;
        const addressId = req.body.addressId;
        const userId = req.session.User?._id || req.session.User;

        
        console.log('Request body:', data);
        console.log('Address ID:', addressId);
        console.log('User ID:', userId);

        
        if (!addressId || !userId) {
            return res.redirect('/pageNotFound'); 
        }

        
        const findAddress = await Address.findOne({ userId, "Address._id": addressId });
        if (!findAddress) {
            return res.redirect('/pageNotFound'); 
        }

        
        await Address.updateOne(
            { userId, "Address._id": addressId }, 
            {
                $set: {
                    "Address.$": {
                        _id: addressId,
                        addressType: data.addressType,
                        Name: data.Name,
                        City: data.City,
                        Landmark: data.Landmark || '',
                        State: data.State,
                        Pincode: Number(data.Pincode), 
                        Phone: Number(data.Phone),
                        AltPhone: data.AltPhone ? Number(data.AltPhone) : null,
                        isDefault: data.isDefault === 'on' || data.isDefault === true
                    }
                }
            }
        );

        
        return res.redirect('/address'); 

    } catch (error) {
        console.error("Error In Edit Address", error);
        return res.redirect('/pageNotFound'); 
    }
};
const deleteAddress = async (req, res) => {
    try {
        const addressId = req.query.id;
        const userId = req.session.User?._id || req.session.User; 

        console.log("Address ID:", addressId);
        console.log("User ID:", userId);

        if (!addressId || !userId) {
            return res.status(400).send("Address ID or User ID is missing");
        }

     
        const findAddress = await Address.findOne({ userId, "Address._id": addressId });
        console.log("Found Address:", findAddress);

        if (!findAddress) {
            return res.status(404).send("Address Not Found");
        }

        
        await Address.updateOne(
            { userId, "Address._id": addressId }, 
            { $pull: { Address: { _id: addressId } } } 
        );

        res.redirect('/address');
    } catch (error) {
        console.error("Error In Deleting Address", error);
        return res.redirect('/pageNotFound'); 
    }
};


const changePassword = async (req,res)=>{
    try {
        res.render("change-password")
    } catch (error) {
        res.redirect('/pageNotFound')
    }
}

const changePasswordValid = async (req, res) => {
    try {
        const { email } = req.body; // Destructure email (lowercase) from req.body

        // Log the incoming request body for debugging
        console.log('Request body:', req.body);
        console.log('Email from body:', email);

        if (!email) {
            return res.render("change-password", {
                message: "Please enter an email address"
            });
        }
        const normalizedEmail = email.trim().toLowerCase();
        const userExist = await User.findOne({ Email: normalizedEmail });

        console.log('User found:', userExist);

        if (userExist) {
            const otp = generateOtp();
        
            const mailOptions = {
                from: process.env.NODEMAILER_EMAIL,
                to: email,
                subject: 'Password Reset OTP',
                text: `Your new OTP for password reset is: ${otp}. It is valid for 10 minutes.`
            };
    
            const emailSent = await transporter.sendMail(mailOptions);
        

            if (emailSent) {
                req.session.userOtp = otp;
                req.session.userData = req.body;
                req.session.email = email;
                res.render("change-password-otp",{email});
                console.log("OTP:", otp);
            } else {
                res.json({
                    success: false,
                    message: "Failed to send OTP, please try again"
                });
            }
        } else {
           
            return res.render("change-password", {
             message: "User with this email does not exist"
            });
        }

    } catch (error) {
        console.error("Error In Password Changing ", error);
        return res.redirect('/pageNotFound'); 
    }
};
const getForgetPassword = async (req,res)=>{
try {
    res.render("forgot-password")
} catch (error) {
    console.error("Error in loading Forgot Password", error);
        res.redirect('/pageNotFound');
}
}


const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
    

        console.log('Request body:', req.body);
        console.log('Email from body:', email);

        if (!email) {
            return res.render("forgot-password", {
                message: "Please enter an email address"
            });
        }

        const normalizedEmail = email.trim().toLowerCase();
       
        
        const userExist = await User.findOne({ Email: normalizedEmail }); // Match schema field name

        console.log('User found:', userExist);

        if (userExist) {
            const otp = generateOtp();
            console.log("OTP IS:",otp)
            const mailOptions = {
                from: process.env.NODEMAILER_EMAIL, // Sender email
                to: email, 
                subject: 'Password Reset OTP',
                text: `Your OTP for password reset is: ${otp}. It is valid for 10 minutes.`
            };

            const emailSent = await transporter.sendMail(mailOptions);
            if (emailSent) {
                req.session.userOtp = otp;
                req.session.userEmail = email; // Store email in session
                req.session.otpTimestamp = Date.now(); // Store timestamp for OTP expiration
                // Pass userEmail as a variable to the template
                res.render("forgot-password-otp", { userEmail: email });
            } else {
                res.render("forgot-password", {
                    message: "Failed to send OTP, please try again"
                });
            }
        } else {
            res.render("forgot-password", {
                message: "User with this email does not exist"
            });
        }
    } catch (error) {
        console.error("Error in Forgot Password", error);
        res.redirect('/pageNotFound');
    }
};

const verifyOtp = async (req, res) => {
    try {
        const { otp } = req.body;
        const storedOtp = req.session.userOtp;
        const otpTimestamp = req.session.otpTimestamp;

        if (!otp || !storedOtp) {
            return res.json({ success: false, message: 'OTP not found or expired' });
        }

        // Check if OTP is valid and not expired (10 minutes = 600,000 ms)
        const currentTime = Date.now();
        if (currentTime - otpTimestamp > 600000) {
            delete req.session.userOtp;
            delete req.session.otpTimestamp;
            return res.json({ success: false, message: 'OTP has expired. Please request a new one.' });
        }

        if (otp === storedOtp) {
            res.json({ success: true, message: 'OTP verified successfully' });
        } else {
            res.json({ success: false, message: 'Invalid OTP, please try again' });
        }
    } catch (error) {
        console.error('Error verifying OTP:', error);
        res.status(500).json({ success: false, message: 'Error verifying OTP' });
    }
};

const resendOtp = async (req, res) => {
    try {
        const { email } = req.body;
        console.log('Request body:', req.body); // Debug log
        console.log('Email from body:', email); // Debug log
        console.log('Session userEmail:', req.session.userEmail); // Debug log

        // Check if email is provided and matches session email
        if (!email) {
            return res.json({ success: false, message: 'Email is required in the request' });
        }

        if (!req.session.userEmail) {
            return res.json({ success: false, message: 'Session expired. Please start the process again.' });
        }

        if (email.trim().toLowerCase() !== req.session.userEmail.trim().toLowerCase()) {
            return res.json({ success: false, message: 'Invalid email or session mismatch' });
        }

        const userExist = await User.findOne({ Email: email.trim().toLowerCase() });
        if (!userExist) {
            return res.json({ success: false, message: 'User not found' });
        }

        const otp = generateOtp();
        const mailOptions = {
            from: process.env.NODEMAILER_EMAIL,
            to: email,
            subject: 'Password Reset OTP',
            text: `Your new OTP for password reset is: ${otp}. It is valid for 10 minutes.`
        };

        const emailSent = await transporter.sendMail(mailOptions);
        if (emailSent) {
            req.session.userOtp = otp;
            req.session.otpTimestamp = Date.now();
            res.json({ success: true, message: 'New OTP sent successfully' });
        } else {
            res.json({ success: false, message: 'Failed to resend OTP, please try again' });
        }
    } catch (error) {
        console.error('Error resending OTP:', error);
        res.status(500).json({ success: false, message: 'Error resending OTP' });
    }
};

const getResetPassword = async (req,res)=>{
    try {
        
        res.render("reset-password")

    } catch (error) {
        console.error('Error Rendering Reset Password Page', error);
        res.status(500).json({ success: false, message: 'Error resending OTP' });
    }
}

const resetPassword = async (req, res) => {
    try {

        const { newPassword, confirmPassword } = req.body;
        const email = req.session.email;

        if (!email) {
            return res.json({ success: false, message: 'Session expired. Please start the process again.' });
        }

        if (!newPassword || !confirmPassword) {
            return res.json({ success: false, message: 'Please provide both password fields.' });
        }

        if (newPassword !== confirmPassword) {
            return res.json({ success: false, message: 'Passwords do not match.' });
        }

        if (newPassword.length < 8 || !/(?=.*[A-Za-z])(?=.*\d)/.test(newPassword)) {
            return res.json({ success: false, message: 'Password must be at least 8 characters long and include a letter and a number.' });
        }

        const user = await User.findOne({ Email: email });
        if (!user) {
            return res.json({ success: false, message: 'User not found.' });
        }

        // Hash the new password (assuming you use bcrypt or similar)
        const bcrypt = require('bcrypt');
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

        user.Password = hashedPassword; // Update password in user schema
        await user.save();

        // Clear session data after successful password reset
        delete req.session.userOtp;
        delete req.session.userEmail;
        delete req.session.otpTimestamp;

        res.json({ success: true, message: 'Password changed successfully' });
    } catch (error) {
        console.error('Error resetting password:', error);
        res.status(500).json({ success: false, message: 'Error resetting password' });
    }
};



const verifyChangePassOtp = async (req, res) => {
    try {
        console.log("Received request in verifyChangePassOtp");
        console.log('Request body:', req.body); // Debug log

        const { otp } = req.body; 
        console.log('Entered OTP from body:', otp);
        req.session.otp = otp;
       
        if (!req.session.userOtp) {
            return res.json({
                success: false,
                message: "No OTP found in session. Please request a new OTP."
            });
        }

     
        if (otp === req.session.userOtp) {
            res.json({
                success: true,
                redirectUrl: "/reset-password"
            });
        } else {
            res.json({
                success: false,
                message: "OTP Not Matching"
            });
        }
    } catch (error) {
        console.error("Error Verifying Change Password OTP", error);
        res.status(500).json({
            success: false,
            message: "Please Try Again Later"
        });
    }
};


const updateProfile = async (req, res) => {
    try {
        const userId = req.session.User; // Use session.User instead of req.user
        if (!userId) return res.redirect('/login');

        const { FirstName, LastName, PhoneNumber } = req.body;

        // Validation
        if (!FirstName || !LastName || !PhoneNumber) {
            return res.render('edit-profile', {
                user: await User.findById(userId),
                error: 'All fields are required'
            });
        }

        // Find and update user
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).send('User not found');
        }

        user.FirstName = FirstName.trim();
        user.LastName = LastName.trim();
        user.PhoneNumber = PhoneNumber.trim();

        await user.save();

        res.redirect('/userProfile');
    } catch (error) {
        console.error("Error updating profile:", error);
        res.status(500).render('edit-profile', {
            user: await User.findById(req.session.User).catch(() => null),
            error: 'Failed to update profile. Please try again.'
        });
    }
};


module.exports={
    userProfile,
    editProfile,
    getAddress,
    addAddress,
    editAddress,
    postEditAddress,
    deleteAddress,
    changePassword,
    changePasswordValid,
    forgotPassword,
    getForgetPassword,
    verifyOtp,
    resendOtp,
    getResetPassword,
    resetPassword,
    verifyChangePassOtp,
    updateProfile
    


}