const mongoose = require('mongoose');
const { Schema } = mongoose;

const CartSchema = new mongoose.Schema({
    UserId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    Items: [{
        ProductId: {
            type: Schema.Types.ObjectId,
            ref: "Product",
            required: true
        },
        Quantity: {
            type: Number,
            default: 1
        },
        Price: {
            type: Number,
            required: true
        },
        TotalPrice: {
            type: Number,
            required: true
        },
        Size: { // Added Size field
            type: String,
            required: true
        },
        Status: {
            type: String,
            default: "placed"
        },
        CancellationReason: {
            type: String,
            default: "none"
        }
    }],
    coupon: {
        couponId: {
            type: Schema.Types.ObjectId,
            ref: "Coupon",
            default: null
        },
        discount: {
            type: Number,
            default: 0 // Stores the discount percentage (e.g., 10 for 10%)
        },
        discountAmount: {
            type: Number,
            default: 0 // Stores the calculated discount amount
        }
    },
    finalTotal: {
        type: Number,
        default: 0 // Stores the final total after discount and tax
    }
});

module.exports = mongoose.model("Cart", CartSchema);