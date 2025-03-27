const Product=require('../../models/productSchema')
const Category=require('../../models/CategorySchema')
const Brand=require('../../models/brandSchema')
const User=require('../../models/userSchema')
const Cart=require('../../models/cartSchema')


const productDetails = async(req, res) => {
    try {
        
        const userId = req.session.User;
        const userData = userId ? await User.findById(userId) : null;
       
        const productId = req.query.id;
        console.log(productId);
        
        if (!productId) {
            return res.redirect('/shop');
        }
    
        const product = await Product.findById(productId).populate('Categorys');
        
        if (!product) {
            return res.redirect('/pageNotFound');
        }
        
        
        const categoryOffer = product.Categorys ? product.Categorys.CategoryOffer || 0 : 0;
        const productOffer = product.ProductOffer || 0;
        let totalOffer=0
        if(categoryOffer>productOffer){
             totalOffer = categoryOffer
        }else{
             totalOffer = productOffer;
        }
       
        
        
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
        const { query, category, brand, priceRange, sort, page = 1, limit = 9 } = req.query;

        // Build the filter object
        const filter = {};
        if (query) {
            filter.ProductName = { $regex: query, $options: 'i' };
        }
        if (category) {
            filter.Categorys = category;
        }
        if (brand) {
            filter.Brands = brand;
        }
        if (priceRange) {
            const [minPrice, maxPrice] = priceRange.split('-');
            filter.SalePrice = { $gte: parseFloat(minPrice) };
            if (maxPrice !== '+') {
                filter.SalePrice.$lte = parseFloat(maxPrice);
            }
        }

        // Build the sort object
        const sortOptions = {};
        if (sort === 'lowToHigh') {
            sortOptions.SalePrice = 1;
        } else if (sort === 'highToLow') {
            sortOptions.SalePrice = -1;
        }

        // Pagination
        const totalProducts = await Product.countDocuments(filter);
        const totalPages = Math.ceil(totalProducts / limit);
        const skip = (page - 1) * limit;

        // Fetch products with filters, sorting, and pagination
        const products = await Product.find(filter)
            .sort(sortOptions)
            .skip(skip)
            .limit(limit)
            .populate('Categorys')
            .populate('Brands');

        // Fetch categories and brands for filters
        const categories = await Category.find();
        const brands = await Brand.find();
        console.log("brands",brand);
        console.log("brands",category);
        

        res.render('shop', {
            products,
            categories,
            brands,
            totalProducts,
            totalPages,
            currentPage: parseInt(page),
            query,
            category,
            brand,
            priceRange,
            sort
        });
    } catch (error) {
        console.error('Error in /shop route:', error);
        res.status(500).render('error', { message: 'Error loading shop page' });
    }
};

module.exports={
    productDetails,
    productPage
}