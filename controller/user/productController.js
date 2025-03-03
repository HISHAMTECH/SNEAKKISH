const Product=require('../../models/productSchema')
const Category=require('../../models/CategorySchema')
const Brand=require('../../models/brandSchema')
const User=require('../../models/userSchema')
// const fs=require("fs")
// const path=require('path')
// const sharp=require('sharp')

const productDetails = async(req, res) => {
    try {
        // Get user id from session if authenticated
        const userId = req.session.userId;
        const userData = userId ? await User.findById(userId) : null;
        
        // Get product id from query parameter
        const productId = req.query.id;
        if (!productId) {
            return res.redirect('/shop');
        }
        
        // Find product by id and populate category
        const product = await Product.findById(productId).populate('Categorys');
        
        if (!product) {
            return res.redirect('/pageNotFound');
        }
        
        // Calculate offers
        const categoryOffer = product.Categorys ? product.Categorys.CategoryOffer || 0 : 0;
        const productOffer = product.ProductOffer || 0;
        const totalOffer = categoryOffer + productOffer;
        
        // Find similar products based on brand, category or color
        const similarProducts = await Product.find({
            $or: [
                { Brands: product.Brands },
                { Categorys: product.Categorys._id },
                { Colour: product.Colour }
            ],
            _id: { $ne: productId },
            isBlocked: false,
            Status: "Available"
        }).limit(4);
        
        // Check if the user has this product in cart
        let cartItem = null;
        if (userId) {
            const cart = await Cart.findOne({ userId });
            if (cart) {
                cartItem = cart.items.find(item => item.productId.toString() === productId);
            }
        }
        
        // Render product details page
        res.render('product-details', {
            user: userData,
            product: product,
            totalOffer: totalOffer,
            category: product.Categorys,
            similarProducts: similarProducts,
            inCart: !!cartItem
        });
        
    } catch (error) {
        console.error("Error fetching product details:", error);
        res.redirect('/pageNotFound');
    }
};



const productPage = async (req, res) => {
    try {
        const userId = req.session.User;
        const category = await Category.find({ isListed: true });
        const brands = await Brand.find({ isBlocked: false }).lean();

        let query = { isBlocked: false };
        const { category: categoryId, brand: brandId, priceRange, sort } = req.query;

        // Filter by category
        if (categoryId) {
            query.Categorys = categoryId;
        } else {
            query.Categorys = { $in: category.map(cat => cat._id) };
        }

        // Filter by brand
        if (brandId) {
            query.brand = brandId; // Adjust based on your schema field for brand
        }

        // Filter by price range
        if (priceRange) {
            const [min, max] = priceRange.split('-').map(Number);
            if (max) {
                query.SalePrice = { $gte: min, $lte: max };
            } else {
                query.SalePrice = { $gte: min };
            }
        }

        let productData = await Product.find(query).lean();

        // Sort products
        if (sort === 'lowToHigh') {
            productData.sort((a, b) => a.SalePrice - b.SalePrice);
        } else if (sort === 'highToLow') {
            productData.sort((a, b) => b.SalePrice - a.SalePrice);
        } else {
            productData.sort((a, b) => new Date(b.timestamps) - new Date(a.timestamps));
        }

        
        console.log('Sort query:', sort); // Debug log for sort

        res.render('shop', {
            product: productData || [],
            categories: category || [],
            brands: brands || [],
            sort: sort || 'lowToHigh' // Pass the sort value to the template
        });
    } catch (error) {
        console.error("Error For Rendering Product Page", error);
        res.redirect('/pageNotFound');
    }
};

module.exports={
    productDetails,
    productPage
}