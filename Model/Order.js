
const mongoose = require("mongoose")
const {Schema,model} = mongoose
require('dotenv').config();
mongoose.connect(process.env.MONGO_URI)
const order = new Schema({
     user:{
            type:mongoose.Schema.Types.ObjectId,ref:"ecommerceuser"
     },
     product:{
        type:mongoose.Schema.Types.ObjectId,ref:"userproduct"
 },
},{timestamps:true})

const Order = model('order',order)
module.exports = Order 
