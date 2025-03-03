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
    try {
        let { categoryName, description } = req.body;
        categoryName = categoryName.trim();
        description = description.trim();

        if (!categoryName || !description) {
            return res.json({ status: false, message: "All fields are required!" });
        }

        if (!/^[A-Za-z\s]+$/.test(categoryName)) {
            return res.json({ status: false, message: "Category name must contain only letters!" });
        }

        const existingCategory = await Category.findOne({ Name: { $regex: new RegExp(`^${categoryName}$`, "i") } });

        if (existingCategory) {
            return res.json({ status: false, message: "Category name already exists!" });
        }

        const newCategory = new Category({ Name: categoryName, Description: description });
        await newCategory.save();

        return res.json({ status: true, message: "Category added successfully!" });

    } catch (error) {
        console.error(error);
        return res.json({ status: false, message: "Something went wrong!" });
    }
}



const addCategoryOffer = async (req, res) => {
    try {
        
        
        const percentage = parseInt(req.body.percentage);
        const categoryId = req.body.categoryId;

        // Validate category
        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(400).json({ status: false, message: "Category Not Found" });
        }

        // Check if any product in this category has a higher individual offer
        const products = await Products.find({ category: category._id });
        const hasProductOffer = products.some((product) => product.ProductOffer > percentage);

        if (hasProductOffer) {
            return res.json({ status: false, message: "Some products already have a higher Product Offer" });
        }

        // Update category offer
        category.CategoryOffer = percentage;
        await category.save();

        // Update all products in the category
        for (const product of products) {
            product.ProductOffer = 0; // Reset individual product offers
            product.SalePrice = Math.floor(product.RegularPrice * (1 - percentage / 100)); // Apply discount
            await product.save();
        }

        res.json({ status: true, message: "Category Offer Added Successfully" });

    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ status: false, message: "Internal Server Error" });
    }
  };
  

const removeCategoryOffer = async (req,res)=>{
    try {
        const categoryId = req.body.categoryId;

        // Validate category
        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(400).json({ status: false, message: "Category Not Found" });
        }

        const percentage = category.CategoryOffer;
        const products = await Products.find({ category: category._id });

        // Reset product sale prices
        for (const product of products) {
            product.SalePrice = product.RegularPrice; // Reset SalePrice to original price
            product.ProductOffer = 0;
            await product.save();
        }

        // Remove category offer
        category.CategoryOffer = 0;
        await category.save();

        res.json({ status: true, message: "Category Offer Removed Successfully" });

    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ status: false, message: "Internal Server Error" });
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
        const categoryId = req.params.id;
        const { categoryName, description } = req.body;

        // Trim and Convert Category Name to Lowercase for Case-Insensitive Check
        const formattedCategoryName = categoryName.trim().toLowerCase();

        // Check if category name already exists (excluding the current category)
        const existingCategory = await Category.findOne({
            Name: { $regex: new RegExp("^" + formattedCategoryName + "$", "i") },
            _id: { $ne: categoryId },
        });

        if (existingCategory) {
            return res.json({
                success: false,
                message: "Category with this name already exists. Please try another name.",
            });
        }

        // Update the category
        await Category.findByIdAndUpdate(categoryId, {
            Name: categoryName.trim(), // Maintain Original Case
            Description: description.trim(),
        });

        res.json({
            success: true,
            message: "Category updated successfully!",
        });

    } catch (error) {
        console.error("Error updating category:", error);
        res.json({
            success: false,
            message: "An error occurred while updating the category.",
        });
    }
};




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