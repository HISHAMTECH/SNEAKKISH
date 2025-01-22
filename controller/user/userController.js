const User=require('../../models/userSchema')




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



const signUp = async (req, res) => {
    const { FirstName, LastName, Email, PhoneNumber, Password, ConfirmPassword } = req.body;

    if (Password !== ConfirmPassword) {
        return res.status(400).send("Passwords do not match");
    }

    try {
        const newUser = new User({
            FirstName,
            LastName,
            Email,
            PhoneNumber,
            Password
        });
        console.log(newUser);

        await newUser.save();
        return res.redirect("/signup");
    } catch (error) {
        console.log('Error For Saving User:', error.message);
        res.status(500).send("Server Error");
    }
};

module.exports = {
    signUp
};




module.exports={
    loadHomePage,
    pageNotFound,
    loadLogin,
    loadSignup,
    signUp
}