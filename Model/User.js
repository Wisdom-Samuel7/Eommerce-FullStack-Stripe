const mongoose = require("mongoose")
const {Schema,model} = mongoose
require('dotenv').config();
mongoose.connect(process.env.MONGO_URI)
const user = new Schema({
    name:{
        type:String,
    },
    email:{
        type:String 
    },
},{timestamps:true})

const User = model('ecommerceuser',user)
module.exports = User 
