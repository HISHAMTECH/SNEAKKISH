const mongoose=require('mongoose')
const {Schema}=mongoose


const orderSchema = new mongoose.Schema({
    OrderId:{
        type:String,
        default:()=>uuidv4()
    },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    OrderedItems: [{
        Product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        Quantity: Number,
        Price: Number,
        Size: String
    }],
    TotalPrice:{
        type:Number,
        required:true
    },
    FinalAmount:{
        type:Number,
        required:true
    },
    Address: {
        addressType: String,
        City: String,
        State: String,
        Pincode: Number,
        _id: mongoose.Schema.Types.ObjectId
    },
    Status:{
        type:String,
        required:true,
        enum:['Pending','Processing','Shipped','Delivered','Cancelled','Return Request','Returned']
    },
    InvoiceDate: Date,
    CreatedOn: { type: Date, default: Date.now }
});
module.exports = mongoose.model('Order', orderSchema);

