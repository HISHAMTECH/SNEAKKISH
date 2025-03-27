const mongoose = require('mongoose');
const { Schema } = mongoose;

const userSchema = new Schema({
    FirstName: {
        type: String,
        required: true
    },
    LastName: {
        type: String,
        required: true
    },
    Email: {
        type: String,
        required: false,
        unique: true,
        sparse: true,
        default: null
    },
    PhoneNumber: {
        type: String,
        required: false,
        default: null
    },
    GoogleId: {
        type: String,
        default: null
    },
    Password: {
        type: String,
        required: false,
    },
    ConfirmPassword: {
        type: String,
        required: false,
    },
    isBlocked: {
        type: Boolean,
        default: false
    },
    isAdmin: {
        type: Boolean,
        default: false
    },
    cart: [{
        type: Schema.Types.ObjectId,
        ref: "Cart"
    }],
    Wallet: {
        type: Number,
        default: 0
    },
    Wishlist: [{
        type: Schema.Types.ObjectId,
        ref: "Wishlist"
    }],
    OrderHistory: [{
        type: Schema.Types.ObjectId,
        ref: "Order"
    }],
    CreatedOn: {
        type: Date,
        default: Date.now
    },
    ReferralCode: {
        type: String,
        default: null
    },
    Redeemed: {
        type: Boolean,
        default: false
    },
    RedeemedUsers: [{
        type: Schema.Types.ObjectId,
        ref: "User"
    }],
    SearchHistory: [{
        Category: {
            type: Schema.Types.ObjectId,
            ref: "Category"
        },
        Brand: {
            type: String
        },
        SearchOn: {
            type: Date,
            default: Date.now
        }
    }],
    // New Address field
    Address: [{
        addressType: {
            type: String,
            enum: ['Home', 'Work', 'Other'],
            required: true
        },
        Name: {
            type: String,
            required: true
        },
        City: {
            type: String,
            required: true
        },
        Landmark: {
            type: String
        },
        State: {
            type: String,
            required: true
        },
        Pincode: {
            type: String,
            required: true
        },
        Phone: {
            type: String,
            required: true
        },
        AltPhone: {
            type: String
        },
        isDefault: {
            type: Boolean,
            default: false
        }
    }]
});

const User = mongoose.model("User", userSchema);
module.exports = User;