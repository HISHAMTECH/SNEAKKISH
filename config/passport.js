const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/userSchema');
const env = require("dotenv").config();

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

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: 'http://localhost:5500/auth/google/callback'
},
async (accessToken, refreshToken, profile, done) => {
    try {
        let user = await User.findOne({ GoogleId: profile.id });
        
        if (user) {
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
            return done(null, user);
        }
    } catch (error) {
        return done(error, null);
    }
}));

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser((id, done) => {
    User.findById(id)
        .then((user) => {
            done(null, user);
        })
        .catch((err) => {
            done(err, null);
        });
});

module.exports = passport;