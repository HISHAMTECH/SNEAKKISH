const { TopologyType } = require('mongodb')
const brand=require('../../models/brandSchema')
const product=require('../../models/productSchema');



const getBrandPage=async (req,res)=>{
    try {
        const page= parseInt(req.query.page) || 1;
        const limit=4
        const skip=(page-1)*limit
        const brandData= await brand.find({}).sort({createdAt:-1}).skip(skip).limit(limit)
        const totalBrands=await brand.countDocuments()
        const totalPages=Math.ceil(totalBrands/limit)
        const reverseBrand=brandData.reverse()
        res.render("brands",{
            data:reverseBrand,
            currentPage:page,
            totalPages:totalPages,
            totalBrands:totalBrands,

        })

    } catch (error) {
        res.redirect('/pageError')
    }
}

const addBrand= async (req,res)=>{
    try {
        const brandName=req.body.name
        const findBrand= await brand.findOne({BrandName:brandName})
        
        if(!findBrand){
            const image=req.file.filename;
        
            const newBrand=new brand({
                BrandName:brandName,
                BrandImage:image,

            })
            await newBrand.save();

        res.redirect('/admin/brands')
        }

    } catch (error) {
        res.redirect('/pageError')
    }
}

const blockBrand= async(req,res)=>{
    try {
        const id=req.query.id
        await brand.updateOne({_id:id},{$set:{isBlocked:true}})
        res.redirect("/admin/brands")
    } catch (error) {
        
    }
}

const unBlockBrand= async(req,res)=>{
    try {
        const id=req.query.id
        await brand.updateOne({_id:id},{$set:{isBlocked:false}})
        res.redirect("/admin/brands")
    } catch (error) {
        
    }
}

const deleteBrand= async(req,res)=>{
    try {
        const {id}=req.query

        if(!id){
            return res.status(400).redirect('/pageError')
        }
        await brand.deleteOne({_id:id})
        res.redirect('/admin/brands')
    
    } catch (error) {
        console.error("Error Deleting Brand ",error);
        res.status(500).redirect('/pageError')
    }
}



module.exports={
    getBrandPage,
    addBrand,
    blockBrand,
    unBlockBrand,
    deleteBrand
}