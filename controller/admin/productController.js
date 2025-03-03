const Product=require('../../models/productSchema')
const Category=require('../../models/CategorySchema')
const Brand=require('../../models/brandSchema')
const User=require('../../models/userSchema')
const fs=require("fs")
const path=require('path')
const sharp=require('sharp')


const getProductAddPage = async (req,res)=>{
    try {
        
        const category= await Category.find({isListed:true})
        const brand= await Brand.find({isBlocked:false})

        res.render('product-add',{
            cat:category,
            brand:brand
        })


    } catch (error) {
        res.redirect('/pageError')
    }
}

const addProduct = async (req,res)=>{
    try {
        
        const products = req.body;
        console.log(products);
        
    
        const productExist = await Product.findOne({
            ProductName:products.productName
        })

        if(!productExist){
            const images=[]

            if(req.files && req.files.length>0){
                for(let i=0;i<req.files.length;i++){
                    const originalImagePath=req.files[i].path

                    const resizedImagePath = path.join('public','uploads','product-images',req.files[i].filename)
                    await sharp(originalImagePath).resize({width:440,height:440}).toFile(resizedImagePath)
                    images.push(req.files[i].filename)
                }
            }
            const categoryId = await Category.findOne({Name:products.category}) 

            if(!categoryId){
                return res.status(400).join("Invalid Category Name")
            }

            console.log("products.Variants:", products.variants);

            const variants = products.variants.map(variant => ({
                Size: Number(variant.size), 
                Quantity: Number(variant.quantity) 
            }));
            
            const newProduct = new Product({
                ProductName: products.productName,
                Description: products.description,
                Brands: products.brand,
                Categorys: categoryId._id,
                RegularPrice: Number(products.regularPrice),
                SalePrice: Number(products.salePrice),
                createdOn: Date.now(),
                Colour: products.colour,
                ProductImage: images,
                Variants: variants
            });
            
            await newProduct.save();
            return res.redirect('/admin/addProducts')

        }else{
        return res.status(400).json("Product Already Exist,Please Try Again With Another Name")
        }

    } catch (error) {
        console.error("Error Saving Product",error);
        return res.redirect('/admin/pageError')
        
    }
}


 
const getAllProducts = async (req, res) => {
    try {
       
        
        
        const search = req.query.search || "";
        const page = parseInt(req.query.page) || 1;
        const limit = 4;

        const filter = {
            $or: [
                { ProductName: { $regex: new RegExp(".*" + search + ".*", "i") } },
                { Brands: { $regex: new RegExp(".*" + search + ".*", "i") } }
            ]
        };

        const productData = await Product.find(filter)
            .limit(limit)
            .skip((page - 1) * limit)
            .populate('Categorys')
            .exec();
          
        const count = await Product.countDocuments(filter);
        
        const categories = await Category.find({ isListed: true });
        const brands = await Brand.find({ isBlocked: false });
       
        if (categories.length > 0 && brands.length > 0) {
          
            res.render('products', {
                data: productData,
                currentPage: page,
                totalPages: Math.ceil(count / limit),
                cat: categories,
                brand: brands
            });
           
        } else {
            res.render("admin-page-404");
        }
    } catch (error) {
        console.log(error);
        res.redirect('/pageError');
    }
};


const addProductOffer = async(req,res)=>{
 

    try {
        const { productId, percentage, finalDiscount } = req.body;
        
        // Update product with both the product offer and final calculated discount
        await Product.findByIdAndUpdate(productId, {
            ProductOffer: percentage,
            FinalDiscount: finalDiscount
        });
        
        res.json({ status: true });
    } catch (error) {
        console.error('Error adding product offer:', error);
        res.json({ status: false, message: 'Error adding product offer' });
    }
}

const checkCategoryOffer = async (req,res)=>{
    try {
        const { productId } = req.body;
        
      
        const product = await Product.findById(productId).populate('Categorys');
        
        if (!product) {
            return res.json({ status: false, message: 'Product not found' });
        }

        
        const hasOffer = product.Categorys.CategoryOffer > 0;
        
        res.json({
            status: true,
            hasOffer,
            offerPercentage: product.Categorys.CategoryOffer || 0
        });
    } catch (error) {
        console.error('Error checking category offer:', error);
        res.json({ status: false, message: 'Error checking category offer' });
    }
}


const removeProductOffer =  async (req,res)=>{
    try {
        
        const {productId} = req.body
        const findProduct = await Product.findOne({_id:productId})
        const percentage = findProduct.ProductOffer;
        findProduct.SalePrice = findProduct.SalePrice + Math.floor(findProduct.RegularPrice*(percentage/100))
       findProduct.ProductOffer=0;
       await findProduct.save()
       res.json({status:true})

    } catch (error) {
        res.redirect('/pageError')
        res.status(500).json({status:false,message:"Internal Server Error"})
    }
}

const blockProduct = async (req,res)=>{
    try {
        const id = req.query.id
        await Product.updateOne({_id:id},{$set:{isBlocked:true}})
        res.redirect('/admin/products')
    } catch (error) {
        res.redirect('/pageError')
    }
}

const unBlockProduct = async (req,res)=>{
    try {
        const id = req.query.id
        await Product.updateOne({_id:id},{$set:{isBlocked:false}})
        res.redirect('/admin/products')
    } catch (error) {
        res.redirect('/pageError')
    }
}


const getEditProduct = async (req,res)=>{
    try {
        const productId = req.query.id;
        
    
        const product = await Product.findOne({_id:productId})
            .populate('Categorys')
            .lean();
     

        if (!product) {
            console.log('Product not found');
            return res.redirect("/admin/pageError");
        }

        const categories = await Category.find({ isListed: true }).lean();
        const brands = await Brand.find({ isBlocked: false }).lean();

        if (!categories || !brands) {
            console.log('Categories or brands not found');
            return res.redirect("/admin/pageError");
        }


        if (!product.Variants) {
            console.log('No variants found, creating default variant');
            product.Variants = [{
                Size: '',
                Quantity: 1,
                status: 'Available'
            }];

            
            
        }
        res.render("edit-product", {
            product: product,
            cat: categories,
            brand: brands

        });

    } catch (error) {
        res.redirect('/admin/pageError')
    }
}


const editProduct = async (req, res) => {
    try {
        const id = req.params.id;
        console.log("Product ID:", id);

        const product = await Product.findOne({ _id: id });
        const data = req.body;

        // Check if product name already exists (excluding current product)
        const existingProduct = await Product.findOne({
            ProductName: data.productName,
            _id: { $ne: id }
        });

        if (existingProduct) {
            return res.status(400).json({ error: "Product With This Name Already Exists. Please Try With Another Name" });
        }

        // Handle Product Images Update
        const images = [];
        if (req.files && req.files.length > 0) {
            for (let i = 0; i < req.files.length; i++) {
                images.push(req.files[i].filename);
            }
        }

        // Handle Variants Update (if variants exist in request body)
        let updatedVariants = product.Variants; // Keep existing variants if not updated
        if (data.variants && Array.isArray(data.variants)) {
            updatedVariants = data.variants.map(variant => ({
                Size: Number(variant.size),
                Quantity: Number(variant.quantity)
            }));
        }

        // Prepare Update Fields
        const updateFields = {
            ProductName: data.productName,
            Description: data.description,
            Brands: data.brand,
            Categorys: product.Categorys, // Keep existing category
            RegularPrice: Number(data.regularPrice),
            SalePrice: Number(data.salePrice),
            Colour: data.colour,
            Variants: updatedVariants, // Update Variants
        };

        // If new images are uploaded, append them
        if (req.files.length > 0) {
            updateFields.$push = { ProductImage: { $each: images } };
        }

        // Perform Update
        await Product.findByIdAndUpdate(id, updateFields, { new: true });
        res.redirect('/admin/products');

    } catch (error) {
        console.error("Error Updating Product:", error);
        res.redirect('/pageError');
    }
};


const deleteSingleImage = async (req,res)=>{

    try {
            const {imageNameToServer,productIdToServer} =req.body
            const product = await Product.findByIdAndUpdate(productIdToServer,{$pull:{ProductImage:imageNameToServer}})
            const imagePath = path.join("public","uploads","re-image",imageNameToServer)

            if(fs.existsSync(imagePath)){
                await fs.unlinkSync(imagePath)
                console.log(`Image ${imageNameToServer} Deleted Succesfully`)
            }else{
                console.log(`Image ${imageNameToServer} Not Found`)
            }

            res.send({status:true})
    } catch (error) {
        res.redirect('/pageError')
        
    }

}



module.exports={
    getProductAddPage,
    addProduct,
    getAllProducts,
    addProductOffer,
    removeProductOffer,
    blockProduct,
    unBlockProduct,
    getEditProduct,
    editProduct,
    deleteSingleImage,
    checkCategoryOffer

}
