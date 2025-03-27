const mongoose = require('mongoose');
const { Schema } = mongoose;

const orderSchema = new Schema({
    OrderId: {
        type: String,
        required: true,
        unique: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId, // Ensure this is an ObjectId
        ref: 'User', // Reference to the User model
        required: true // Optional, depending on your use case
    },
    OrderedItems: [{
        Product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true
        },
        Quantity: {
            type: Number,
            required: true
        },
        Price: {
            type: Number,
            required: true
        },
        Size: {
            type: String,
            required: true
        }
    }],
    TotalPrice: {
        type: Number,
        required: true
    },
    Tax: {
        type: Number,
        
    },
    Discount: {
        type: Number,
        default: 0
    },
    FinalAmount: {
        type: Number,
        required: true
    },
    Address: {
        addressType: {
            type: String,
            default: 'N/A'
        },
        City: {
            type: String,
            default: 'N/A'
        },
        State: {
            type: String,
            default: 'N/A'
        },
        Pincode: {
            type: String,
            default: 'N/A'
        },
        _id: {
            type: Schema.Types.ObjectId,
            required: true
        }
    },
    Status: {
        type: String,
        default: 'Pending'
    },
    InvoiceDate: {
        type: Date,
        default: Date.now
    },
    WalletAmount: {
        type: Number,
        default: 0
    },
    PaymentMethod: {
        type: String,
        enum: ['cod', 'wallet', 'mixed','razorpay'],
        default: 'cod'
    },
    // Add missing fields
    CancellationReason: {
        type: String,
        default: 'none'
    },
    ReturnReason: {
        type: String,
        default: ''
    }
});

const Order = mongoose.model("Order", orderSchema);

module.exports = Order;