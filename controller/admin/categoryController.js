const { parse } = require('dotenv')
const Category = require('../../models/CategorySchema')
const Products = require("../../models/productSchema")


const categoryInfo= async(req,res)=>{
    try {
        const page=parseInt(req.query.page) || 1;
        const limit=4;
        const skip=(page-1)*limit;

        const categoryData=await Category.find({})
        .sort({createdAt:-1})
        .skip(skip)
        .limit(limit)

        const totalCategories= await Category.countDocuments();
        const totalPages= Math.ceil(totalCategories/limit)
        res.render('category',{
            category:categoryData,
            currentPage:page,
            totalPage:totalPages,
            totalCategories:totalCategories

        })

        
    } catch (error) {
      console.log(error);
      res.redirect('/pageError')
        
    }
    
}

const addCategory= async (req,res)=>{
    const {Name,Description}=req.body;
    try {
        const existingCategory= await Category.findOne({Name})
        if(existingCategory){
            return res.status(400).json({error:"Category Already Existing"})
        }

        const newCategory= new Category({
            Name,
            Description
        })
        await newCategory.save()
        return res.json({message:"Category Added Successfully"})
    } catch (error) {
        return res.status(500).json({error:'Internal Server Error'})
    }
}



// const addCategoryOffer = async (req,res)=>{
//   try {
//     const percentage= parseInt(req.body.percentage)
//     const categoryId=req.body.categoryId
//     const category = await Category.findById(categoryId)

//     if(!category){
//         return res.status(400).json({status:false,message:"Category Not Found"})
//     }

//     const products= await Products.find({category:category._id})
//     const hasProductOffer= products.some((product)=>{
//         product.ProductOffer > percentage
//     })

//     if(hasProductOffer){
//         return res.json({status:false,message:"Products Within This Category Already Have Product Offer "})
//     }
//     await Category.updateOne({_id:categoryId},{$set:{CategoryOffer:percentage}})

//     for (const product of products){
//         product.ProductOffer=0;
//         product.SalePrice=product.RegularPrice;
//         await product.save()
//     }
//     res.json({status:true})


//   } catch (error) {

//     res.json({status:false,message:"Internal Server"})
    
//   }

// }

const addCategoryOffer = async (req, res) => {
    try {
      const percentage = parseInt(req.body.percentage);
      const categoryId = req.body.categoryId;
      const category = await Category.findById(categoryId);
  
      if (!category) {
        return res.status(400).json({ status: false, message: "Category Not Found" });
      }
  
      const products = await Products.find({ category: category._id });
      const hasProductOffer = products.some((product) => product.ProductOffer > percentage);
  
      if (hasProductOffer) {
        return res.json({ status: false, message: "Products Within This Category Already Have Product Offer" });
      }
  
      // Update category offer
      const updatedCategory = await Category.findByIdAndUpdate(categoryId, {
        $set: { CategoryOffer: percentage }
      }, { new: true });
  
      if (!updatedCategory) {
        return res.json({ status: false, message: "Failed to update the category offer" });
      }
  
      // Update products in the category
      for (const product of products) {
        product.ProductOffer = 0;
        product.SalePrice = product.RegularPrice; // Reset SalePrice to RegularPrice
        await product.save();
      }
  
      res.json({ status: true, message: "Offer Added Successfully" });
  
    } catch (error) {
      console.log("Error:", error);
      res.status(500).json({ status: false, message: "Internal Server Error" });
    }
  };
  

const removeCategoryOffer = async (req,res)=>{

    try {
        const categoryId=req.body.categoryId
        const category= await Category.findById(categoryId)

        if(!category){
            return res.json({status:false,message:"Category Not Found"})
        }

        const percentage=category.CategoryOffer;
        const products= await Products.find({category:category._id})

        if(products.length >0){
            for(const product of products){
                product.SalePrice += Math.floor(product.RegularPrice * (percentage/100))
                product.ProductOffer=0;
                await product.save()
            }
        }

        category.CategoryOffer=0;
            await category.save()
            res.json({status:true})

    } catch (error) {
        res.status(500).json({status:false,message:"Internal Server Error"})
    }

}

const getListCategory= async (req,res)=>{

    try {
        const id=req.query.id
        
        await Category.updateOne({_id:id},{$set:{isListed:false}})

        res.redirect('/admin/category')


    } catch (error) {
        res.redirect('/pageError')
        
    }

}

const getUnListCategory= async (req,res)=>{

    try {
        const id=req.query.id
        console.log(id)
        await Category.updateOne({_id:id},{$set:{isListed:true}})

        res.redirect('/admin/category')


    } catch (error) {
        res.redirect('/pageError')
        
    }

}

const getEditCategory =async (req,res)=>{
    try {
        const id=req.query.id
        const category= await Category.findOne({_id:id})
        res.render('edit-category',{category:category})
    } catch (error) {
        
    }

}

const editCategory =async (req,res)=>{

    try {
        const id=req.params.id
        const {categoryName,description}=req.body
        const existingCategory= await Category.findOne({Name:categoryName})
        if(existingCategory){
            return res.status(400).json({error:"Category Alread Exists,Please Choose Another Name"})
        }


        const updateCategory= await Category.findByIdAndUpdate(id,{
            Name:categoryName,
            Description:description
        },{new:true})

        if(updateCategory){
             res.redirect('/admin/category')
        }else{
            res.status(404).json({error:"Category Not Found"})
        }
    } catch (error) {
        res.status(500).json({error:"Internal Server Error"})
    }

}



module.exports={
    categoryInfo,
    addCategory,
    addCategoryOffer,
    removeCategoryOffer,
    getListCategory,
    getUnListCategory,
    getEditCategory,
    editCategory
}