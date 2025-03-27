const mongoose = require('mongoose');
const { Schema } = mongoose;

const couponSchema = new Schema({
    Name: {
        type: String,
        required: true,
        unique: true
    },
    OfferPrice: {
        type: Number,
        required: true
    },
    MinimumPrice: {
        type: Number,
        required: true
    },
    CreatedOn: {
        type: Date,
        required: true
    },
    ExpiryOn: {
        type: Date,
        required: true
    },
    isListed: {
        type: Boolean,
        default: true
    },
    couponType: {  // New field to distinguish coupon types
        type: String,
        enum: ['general', 'referral'],
        default: 'general'
    },
    assignedUsers: [{  // Array to track users who have this coupon
        type: Schema.Types.ObjectId,
        ref: 'User'
    }],
    usageLimit: {  // For referral coupons, max number of uses (0 = unlimited)
        type: Number,
        default: 0
    },
    timesUsed: {  // Track how many times the coupon has been assigned
        type: Number,
        default: 0
    }
});

const Coupon = mongoose.model('Coupon', couponSchema);
module.exports = Coupon;