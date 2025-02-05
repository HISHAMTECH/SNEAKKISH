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

            const newProduct = new Product({
                 
                ProductName:products.productName,
                Description:products.description,
                Brands:products.brand,
                Categorys:categoryId._id,
                RegularPrice:products.regularPrice,
                SalePrice:products.salePrice,
                createdOn:Date.now(),
                Quantity:products.quantity,
                Size:products.size,
                Colour:products.colour,
                ProductImage:images,
                Status:"Available"

            })

            await newProduct.save()
            return res.redirect('/admin/addProducts')

        }else{
        return res.status(400).json("Product Already Exist,Please Try Again With Another Name")
        }

    } catch (error) {
        console.error("Error Saving Product",error);
        return res.redirect('/admin/pageError')
        
    }
}

// const getAllProducts = async(req,res)=>{
//     try {
//         const search = req.query.search || "";
//         const page = req.query.page || 1;
//         const limit=4

//         const productData= await Product.find({
//             $or:[
//                 {ProductName:{$regex:new RegExp(".*"+ search +".*","i")}},
//                 {Brands:{$regex:new RegExp(".*"+ search +".*","i")}}
//             ],
            
//         }).limit(limit*1).skip((page-1)*limit).populate('category').exec()

//         const count = await Product.find({
//             $or:[
//                 {ProductName:{$regex:new RegExp(".*"+ search +".*","i")}},
//                 {Brands:{$regex:new RegExp(".*"+ search +".*","i")}}
//             ],
            
//         }).countDocuments()

//         const categorys = await Category.find({isListed:true})
//         const brands = await Brand.find({isBlocked:false})

//         if(categorys && brands){
//             res.render('products',{
//                 data:productData,
//                 currentPages:page,
//                 totalPages:Math.ceil(count/limit),
//                 cat:categorys,
//                 brand:brands
//             })
//         }else{
//             res.render("admin-page-404")
//         }

//     } catch (error) {
//         res.redirect('/pageError')
//     }
// }
 
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


module.exports={
    getProductAddPage,
    addProduct,
    getAllProducts
}
