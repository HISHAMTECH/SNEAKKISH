// const User=require('../models/userSchema')

// const userAuth=(req,res,next)=>{
//     if(req.session.User){
//         console.log(req.session.User);
        
//         next()
//     }
//     else{
//         res.redirect('/login')
//     }
// }


// const adminAuth=(req,res,next)=>{
//     if(req.session.admin){
//         next()
//     }
//     else{
//         res.redirect('/admin/login')
//     }
// }

// module.exports={
//     userAuth,
//     adminAuth
// }

const User = require('../models/userSchema');

const userAuth = async (req, res, next) => {
    if (req.session.User) {
        try {
            const user = await User.findById(req.session.User._id);
            if (!user) {
                // User not found (e.g., deleted)
                req.session.destroy((err) => {
                    if (err) {
                        console.error('Session destroy error:', err);
                    }
                    return res.redirect('/login?message=User not found');
                });
            } else if (user.isBlocked) {
                // User is blocked
                req.session.destroy((err) => {
                    if (err) {
                        console.error('Session destroy error:', err);
                    }
                    return res.redirect('/login?message=Your account has been blocked');
                });
            } else {
                // User is authenticated and not blocked
                console.log('Authenticated user:', req.session.User);
                next();
            }
        } catch (error) {
            console.error('Error in userAuth middleware:', error);
            res.status(500).render('errors/error', {
                title: 'Server Error',
                error: 'Something went wrong!'
            });
        }
    } else {
        res.redirect('/login');
    }
};

const adminAuth = (req, res, next) => {
    if (req.session.admin) {
        next();
    } else {
        res.redirect('/admin/login');
    }
};

module.exports = {
    userAuth,
    adminAuth
};