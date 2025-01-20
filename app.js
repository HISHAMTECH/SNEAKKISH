const express=require('express')
const env=require('dotenv').config()
const db=require('./confiq/db')
const app=express()

db()

app.listen(process.env.PORT,()=>{
    console.log("server running");
    
})

module.exports=app

