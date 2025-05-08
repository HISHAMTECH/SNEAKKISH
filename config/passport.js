const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/userSchema');
require('dotenv').config();

function generateReferralCode(baseString, length = 8) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let referralCode = '';

    for (let i = 0; i < baseString.length && i < length; i++) {
        const char = baseString[i].toUpperCase();
        if (characters.includes(char)) {
            referralCode += char;
        }
    }

    while (referralCode.length < length) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        referralCode += characters[randomIndex];
    }

    return referralCode;
}

// Determine the environment and set callback URL
const env = process.env.NODE_ENV || 'development'; // Default to development if NODE_ENV is not set
console.log('Environment (NODE_ENV):', env);
const callbackURL = env === 'production' 
    ? 'https://sneakkish.shop/auth/google/callback' 
    : 'http://localhost:5501/auth/google/callback';
console.log('Google OAuth Callback URL:', callbackURL);

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: callbackURL
}, async (accessToken, refreshToken, profile, done) => {
    try {
        let user = await User.findOne({ GoogleId: profile.id });
        
        if (user) {
            console.log('Existing user found:', user.Email);
            return done(null, user);
        } else {
            const referralCode = generateReferralCode(profile.emails[0].value);
            
            user = new User({
                FirstName: profile.name.givenName,
                LastName: profile.name.familyName,
                Email: profile.emails[0].value,
                GoogleId: profile.id,
                ReferralCode: referralCode,
                isVerified: true
            });
            await user.save();
            console.log('New user created:', user.Email);
            return done(null, user);
        }
    } catch (error) {
        console.error('Error in GoogleStrategy:', error);
        return done(error, null);
    }
}));

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});

module.exports = passport;