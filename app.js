const express = require("express")
const app = express()
const bp = require("body-parser")
const User = require("./Model/User") 
const Product = require("./Model/Product")
const Order = require("./Model/Order")
const webToken = require("jsonwebtoken")
const cookies = require("cookie-parser")
const multer = require('multer')
const path = require("path")
const mongoose = require("mongoose")
const stripe = require("stripe")
const cors = require("cors")

const stripePay = stripe("sk_test_51QbRWZDA4PZQJ9IUppeKl9qj3fVlzGzKVa3Mr56Z8qds0oj3FEa4SqAviianuIA9PMLXyAtbQzh8KOcdOO6Qoqms00u1akuua0")
require("dotenv").config()

app.use(cors({
    origin:'*',
    
}))
app.use(express.static("Public"))
const storage = multer.diskStorage({
    destination:(req,file,cb)=>{
        cb(null,'Public/images/')
    },
    filename:(req,file,cb)=>{
        cb(null,file.fieldname + Date.now() + path.extname(file.originalname))
    }
})

const upload = multer({ 
    storage ,
    limits: { fileSize: 10000000 }, //10MB STORAGE
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
           // console.log(file)
            return cb(null, true)
        } else {
            return cb(new Error('Invalid file type'))
        }
    }
});

const {AuthenticateUser} = require("./Protectedroute/Authcontext")
 


app.use(bp.json())
app.use(bp.urlencoded({extended:false}))
app.use(cookies())
var participant 

app.set("view engine","ejs")


app.get("/",(req,res)=>{
    res.render("../Views/home")
})


app.post("/",async (req,res)=>{
    const {name,email} = req.body
    const validate = await User.exists({email})

  if(!validate){
     try { 
         const user = await User.create({name,email})
       
         console.log(user)
         participant = user
         
         res.render("../Views/login",{ message: "" })

     } catch (error) { 
        console.error(error)
     }
  }else{
    res.json({message:'USER ALREADY EXIST'})
  }
})

 
app.get("/login",(req,res)=>{
    res.render("../Views/login", { message: "" })
    
})

app.post("/login",async (req,res)=>{
    try{ 
        const {email} = req.body
  
        const user = await User.findOne({email})

        if(email ==""){
            res.render("../Views/login", { message: "Input field cannot be empty..." })
        }else{

             if(user){

                  const token = webToken.sign({ userId: user._id },process.env.JWT_KEY,{expiresIn:"1hr"}) 
                   await res.cookie("accesstoken",token,{
                    httpOnly:true,
                   })

              res.redirect("/")

              console.log(user)
              console.log(token)  

             }else{
                res.render("../Views/login", { message: "User does not exist" })
             }

        }

    }catch(error){
        console.error(error)
    }
    
})


app.get("/addproduct",AuthenticateUser,(req,res)=>{
    res.render("../Views/addproduct",{review:""})
    
}) 


app.post("/addproduct",AuthenticateUser,upload.single('image'),async (req,res)=>{
    
    try {

       const {name,price,category} = req.body

        const imageFile = req.file ? req.file : null
        const product = await Product.create({
            name:name,
            price:price,
            category:category,
            participant:req.user.userId,
            profilePicture:{
                filename:imageFile.filename,
                path:imageFile.path
            }
        }) 

        res.render("../Views/addproduct",{review:"Added Successfully"})
    } catch (error) {
        console.error(error)
    } 
    
}) 
 

app.get("/dashboard",AuthenticateUser,async (req,res)=>{
    const p = await Product.aggregate([{
        $match:{participant:{$in:[new mongoose.Types.ObjectId(req.user.userId)]}}
    }]) 

    res.render("../Views/dashboard",{product:p})

 }) 
 

 // KNOWURCRAFT 
 
 
 app.get("/product",AuthenticateUser,async (req,res)=>{
     const product = await Product.find()
     console.log(product)
     res.render("../Views/products",{products:product})
   
    })
    

 app.get("/logout",(req,res)=>{ 
       res.clearCookie("accesstoken")
        res.redirect("/login")
        
    }) 



    
app.get("/cart",AuthenticateUser,async (req,res)=>{
    
    const orderU =  await Order.find().populate("user product")
    let totalprice 



    // P O P U L A T I N G    IN     A G G R E G A T I O N 
     const userOrder = await Order.aggregate([    
        {
            $match :{user:{$in:[new mongoose.Types.ObjectId(req.user.userId)]}}
        },  
         {
            $lookup: {
              from: "ecommerceusers", // The collection name of the referenced "User" schema
              localField: "user", // The field in the "Order" schema
              foreignField: "_id", // The field in the "User" schema
              as: "userDetails", // The name of the resulting array
            },
          },
          {
            $lookup: {
              from: "userproducts", // The collection name of the referenced "User" schema
              localField: "product", // The field in the "Order" schema
              foreignField: "_id", // The field in the "User" schema
              as: "productDetails", // The name of the resulting array
            },
          },
          {
            $unwind: "$userDetails", // Unwind user details (optional if one user per order)
          },
          {
            $unwind: "$productDetails", // Unwind product details (optional if one product per order)
          },
        
    ])




    // const count = result.length 

      //  G R O U P I N G 
      const groupItems = await Order.aggregate([
        {
            $match :{user:{$in:[new mongoose.Types.ObjectId(req.user.userId)]}}
        },  
        {
            $lookup: {
              from: "userproducts", // Collection name for `Product`
              localField: "product", // Field in `Order`
              foreignField: "_id", // Field in `Product`
              as: "productDetails",
            },
        },
       
        {
            $unwind: "$productDetails", // Unwind the `productDetails` array
        },
        {
            $group: {
         
              _id: "$product", // Group by product ID
              totalQuantity: { $sum: 1 }, // Count each occurrence
              totalPrice: { $sum: "$productDetails.price" }, // Sum the price of the product
              productName: { $first: "$productDetails.name" } // Get the product name
            },
        },

      
      ])
  
 console.log(groupItems)



      // S U M M A T I O N 
      const totalPrice = await Order.aggregate([
        {
            $match :{user:{$in:[new mongoose.Types.ObjectId(req.user.userId)]}}
        },  
        {
            $lookup: {
              from: "userproducts", // Collection name for `Product`
              localField: "product", // Field in `Order`
              foreignField: "_id", // Field in `Product`
              as: "productDetails",
            },
        },
       
        {
            $unwind: "$productDetails", // Unwind the `productDetails` array
        },
        {
            $group: {
              _id: null, // We don't group by any specific field
              totalPrice: { $sum: '$productDetails.price' }, // Sum all `productDetails.price`
            },
        },
         
        {
            $project: {
              _id: 0, // Exclude the `_id` field
              totalPrice: 1, // Include the totalPrice field
            },
          },
      
      ])
      
        // totalprice = result 
        console.log("Number of unique categories in Orders:", totalPrice )

    res.render("../Views/carts",{orders:userOrder,count:userOrder.length,collections:groupItems})
    
}) 


app.post("/cart",AuthenticateUser,async (req,res)=>{
  const {productID} = req.body
  const order = await Order.create({user:req.user.userId,product:productID})

     const orderU =  await Order.find().populate("user product")
     const userOrder = await Order.aggregate([{
       $match :{user:{$in:[new mongoose.Types.ObjectId(req.user.userId)]}},
       
     }])
  
}) 


app.post("/checkout",async (req,res)=>{
    console.log(req.body) 
   
      // Convert `items` array to Stripe `line_items` format
      const lineItems = req.body.map(item => ({
        price_data: {
          currency: 'usd', // Set currency
          product_data: {
            name: item.productName // Set product name
          },
          unit_amount: Math.round(item.totalPrice / item.totalQuantity * 100) // Calculate unit price in cents
        },
        quantity: item.totalQuantity // Set quantity
      }));

      console.log(lineItems)

  const session = await stripePay.checkout.sessions.create({

     line_items: lineItems,
     mode : "payment",
     success_url:"http://localhost:4000/success",
     cancel_url : "http://localhost:4000/cancel"
  })

 res.json(session.url)
})


app.get("/success",AuthenticateUser,async (req,res)=>{
    const userOrder = await Order.aggregate([    
        {
            $match :{user:{$in:[new mongoose.Types.ObjectId(req.user.userId)]}}
        },  
         {
            $lookup: {
              from: "ecommerceusers", // The collection name of the referenced "User" schema
              localField: "user", // The field in the "Order" schema
              foreignField: "_id", // The field in the "User" schema
              as: "userDetails", // The name of the resulting array
            },
          },
          {
            $lookup: {
              from: "userproducts", // The collection name of the referenced "User" schema
              localField: "product", // The field in the "Order" schema
              foreignField: "_id", // The field in the "User" schema
              as: "productDetails", // The name of the resulting array
            },
          },
          {
            $unwind: "$userDetails", // Unwind user details (optional if one user per order)
          },
          {
            $unwind: "$productDetails", // Unwind product details (optional if one product per order)
          },
          {
            $project: {
              productId: '$productDetails._id', // Get the product ID
              productName: '$productDetails.name', // Optionally include other fields
              productStatus: '$productDetails.status'
            }
          }
        
    ])

    const productIds = userOrder.map(order => order.productId);
    
    await Product.updateMany(
        { _id: { $in: productIds } }, // Match products by their IDs
        { $set: { status: 'sold' } }   // Set the status to "sold"
      ); 

  const product = await Product.find()
  console.log(product)
    res.send("PAYMENT WAS SUCCESSFUL")
})

app.get("/cancel",(req,res)=>{
  res.  redirect("/cart")
})

app.listen(4000,()=>{   
    console.log("APP SERVER RUNNING")
}) 