const mongoose = require("mongoose")
const {Schema,model} = mongoose

require('dotenv').config();
mongoose.connect(process.env.MONGO_URI)
const product = new Schema({
    name:{
        type:String, 
    },
    price:{
        type:Number,
    },
    category:{
        type:String,
    },
    participant:{
        type:mongoose.Schema.Types.ObjectId,ref:"ecommerceuser"
    },
    profilePicture: {
        filename: String,
        path: String,
    },
    status: {
        type: String,
        enum: ['available', 'sold', 'discontinued'], // Example options
        default: 'available',
      },
},{timestamps:true})

const Product = model('userproduct',product)
module.exports = Product  
