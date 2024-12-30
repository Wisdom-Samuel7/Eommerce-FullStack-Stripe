
// KNOWURCRAFT 
// jwt = json web token 

// installation --- npm i jsonwebtoken 
// jsobwebtoken 

// JSON Web Tokens are most commonly used to identify an authenticated user  
// JWT are JSON Object which is used to securely transfer information over the web(between two parties)
// JWT allows the user to access routes, services, and resources that are permitted with that token


const jwt = require("jsonwebtoken")
require("dotenv").config()

 async function AuthenticateUser(req,res,next){
    const token = await req.cookies.accesstoken
   
    if(!token){
    res.redirect("/login")
   }else{
         jwt.verify(token,process.env.JWT_KEY,(err,user)=>{
             if(err){
                  res.redirect("/login")
             }else{
                  req.user = user 
                  next()
             }
         })
   }

 }


 module.exports = { AuthenticateUser }

