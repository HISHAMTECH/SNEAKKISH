const Product=require('../../models/productSchema')
const Category=require('../../models/CategorySchema')
const Brand=require('../../models/brandSchema')
const User=require('../../models/userSchema')
const Cart=require('../../models/cartSchema')


// const productDetails = async(req, res) => {
//     try {
        
//         const userId = req.session.User;
//         const userData = userId ? await User.findById(userId) : null;
       
//         const productId = req.query.id;
//         console.log(productId);
        
//         if (!productId) {
//             return res.redirect('/shop');
//         }
    
//         const product = await Product.findById(productId).populate('Categorys');
        
//         if (!product) {
//             return res.redirect('/pageNotFound');
//         }
        
        
//         const categoryOffer = product.Categorys ? product.Categorys.CategoryOffer || 0 : 0;
//         const productOffer = product.ProductOffer || 0;
//         let totalOffer=0
//         if(categoryOffer>productOffer){
//              totalOffer = categoryOffer
//         }else{
//              totalOffer = productOffer;
//         }

//         const similarProducts = await Product.find({
//             $or: [
//                 { Brands: product.Brands },
//                 { Categorys: product.Categorys._id },
//                 { Colour: product.Colour }
//             ],
//             _id: { $ne: productId },
//             isBlocked: false,
//             Status: "Available"
//         }).limit(4);
        
        
//         let cartItem = null;
//         if (userId) {
//             const cart = await Cart.findOne({ userId });
//             if (cart) {
//                 cartItem = cart.items.find(item => item.productId.toString() === productId);
//             }
//         }
        
//         // Render product details page
//         res.render('product-details', {
//             user: userData,
//             product: product,
//             totalOffer: totalOffer,
//             category: product.Categorys,
//             similarProducts: similarProducts,
//             inCart: !!cartItem
//         });
        
//     } catch (error) {
//         console.error("Error fetching product details:", error);
//         res.redirect('/pageNotFound');
//     }
// };



// const productPage = async (req, res) => {
//     try {
//         const { query, category, brand, priceRange, sort, page = 1, limit = 9 } = req.query;

//         // Build the filter object
//         const filter = {};
//         if (query) {
//             filter.ProductName = { $regex: query, $options: 'i' };
//         }
//         if (category) {
//             filter.Categorys = category;
//         }
//         if (brand) {
//             filter.Brands = brand;
//         }
//         if (priceRange) {
//             const [minPrice, maxPrice] = priceRange.split('-');
//             filter.SalePrice = { $gte: parseFloat(minPrice) };
//             if (maxPrice !== '+') {
//                 filter.SalePrice.$lte = parseFloat(maxPrice);
//             }
//         }

//         // Build the sort object
//         const sortOptions = {};
//         if (sort === 'lowToHigh') {
//             sortOptions.SalePrice = 1;
//         } else if (sort === 'highToLow') {
//             sortOptions.SalePrice = -1;
//         }

//         // Pagination
//         const totalProducts = await Product.countDocuments(filter);
//         const totalPages = Math.ceil(totalProducts / limit);
//         const skip = (page - 1) * limit;

//         // Fetch products with filters, sorting, and pagination
//         const products = await Product.find(filter)
//             .sort(sortOptions)
//             .skip(skip)
//             .limit(limit)
//             .populate('Categorys')
//             .populate('Brands');

//         // Fetch categories and brands for filters
//         const categories = await Category.find();
//         const brands = await Brand.find();
//         console.log("brands",brand);
//         console.log("brands",category);
        

//         res.render('shop', {
//             products,
//             categories,
//             brands,
//             totalProducts,
//             totalPages,
//             currentPage: parseInt(page),
//             query,
//             category,
//             brand,
//             priceRange,
//             sort
//         });
//     } catch (error) {
//         console.error('Error in /shop route:', error);
//         res.status(500).render('error', { message: 'Error loading shop page' });
//     }
// };



// const productPage = async (req, res) => {
//     try {
//         const { query, category, brand, priceRange, sort, page = 1, limit = 9 } = req.query;
//         console.log("req", req.query);
        
//         // Build the filter object
//         const filter = {};
//         if (query) {
//             filter.ProductName = { $regex: query, $options: 'i' };
//         }
//         if (category) {
//             filter.Categorys = category;
//         }
//         if (brand) {
//             filter.Brands = brand;
//         }
//         if (priceRange) {
//             const [minPrice, maxPrice] = priceRange.split('-');
//             filter.SalePrice = { $gte: parseFloat(minPrice) };
//             if (maxPrice !== '+') {
//                 filter.SalePrice.$lte = parseFloat(maxPrice);
//             }
//         }

//         // Build the sort object
//         const sortOptions = {};
//         if (sort === 'lowToHigh') {
//             sortOptions.SalePrice = 1;
//         } else if (sort === 'highToLow') {
//             sortOptions.SalePrice = -1;
//         }

//         // Pagination
//         const totalProducts = await Product.countDocuments(filter);
//         const totalPages = Math.ceil(totalProducts / limit);
//         const skip = (page - 1) * limit;

//         // Function to round prices to nearest 5 or 10 (same as home page)
//         const roundToNearest5or10 = (num) => {
//             const integerPart = Math.floor(num);
//             const decimalPart = num - integerPart;
//             if (decimalPart > 0.75) {
//                 return Math.ceil(num / 10) * 10; 
//             } else {
//                 return Math.round(num / 5) * 5; 
//             }
//         };

//         // Fetch products with filters, sorting, and pagination
//         const productsRaw = await Product.find(filter)
//             .sort(sortOptions)
//             .skip(skip)
//             .limit(limit)
//             .populate('Categorys');

//         // Process products to include offer logic and rounded prices
//         const products = productsRaw.map(product => {
//             const categoryOffer = product.Categorys?.CategoryOffer || 0;
//             const productOffer = product.ProductOffer || 0;
//             const highestOffer = Math.max(categoryOffer, productOffer);
//             let displayPrice = product.SalePrice;
//             let offerPrice = null;

//             if (highestOffer > 0) {
//                 const discount = (highestOffer / 100) * product.SalePrice;
//                 const offerPriceRaw = product.SalePrice - discount;
//                 offerPrice = roundToNearest5or10(offerPriceRaw);
//             }
//             displayPrice = roundToNearest5or10(product.SalePrice);

//             return {
//                 ...product.toObject(),
//                 displayPrice,
//                 offerPrice,
//                 appliedOffer: highestOffer
//             };
//         });

//         // Fetch categories and brands for filters
//         const categories = await Category.find();
//         const brands = await Brand.find();
//         console.log("brands", brand);
        

//         res.render('shop', {
//             products,
//             categories,
//             brands,
//             totalProducts,
//             totalPages,
//             currentPage: parseInt(page),
//             query,
//             category,
//             brand,
//             priceRange,
//             sort
//         });
//     } catch (error) {
//         console.error('Error in /shop route:', error);
//         res.status(500).render('error', { message: 'Error loading shop page' });
//     }
// };

// const productPage = async (req, res) => {
//     try {
//         const { query, category, brand, priceRange, sort, page = 1, limit = 9 } = req.query;
//         console.log("req", req.query);
        
//         // Build the filter object
//         const filter = {};
//         if (query) {
//             filter.ProductName = { $regex: query, $options: 'i' };
//         }
//         if (category) {
//             filter.Categorys = category;
//         }
        
//         // Get brand name using the brand ID
//         if (brand) {
//             const brandDoc = await Brand.findById(brand);
//             if (brandDoc) {
//                 filter.Brands = brandDoc.BrandName; // Use brand name since Brands is stored as String
//             }
//         }
        
//         if (priceRange) {
//             const [minPrice, maxPrice] = priceRange.split('-');
//             filter.SalePrice = { $gte: parseFloat(minPrice) };
//             if (maxPrice !== '+') {
//                 filter.SalePrice.$lte = parseFloat(maxPrice);
//             }
//         }

//         // Build the sort object
//         const sortOptions = {};
//         if (sort === 'lowToHigh') {
//             sortOptions.SalePrice = 1;
//         } else if (sort === 'highToLow') {
//             sortOptions.SalePrice = -1;
//         }

//         // Pagination
//         const totalProducts = await Product.countDocuments(filter);
//         const totalPages = Math.ceil(totalProducts / limit);
//         const skip = (page - 1) * limit;

//         // Function to round prices to nearest 5 or 10 (same as home page)
//         const roundToNearest5or10 = (num) => {
//             const integerPart = Math.floor(num);
//             const decimalPart = num - integerPart;
//             if (decimalPart > 0.75) {
//                 return Math.ceil(num / 10) * 10; 
//             } else {
//                 return Math.round(num / 5) * 5; 
//             }
//         };

//         // Fetch products with filters, sorting, and pagination
//         const productsRaw = await Product.find(filter)
//             .sort(sortOptions)
//             .skip(skip)
//             .limit(limit)
//             .populate('Categorys');

//         // Process products to include offer logic and rounded prices
//         const products = productsRaw.map(product => {
//             const categoryOffer = product.Categorys?.CategoryOffer || 0;
//             const productOffer = product.ProductOffer || 0;
//             const highestOffer = Math.max(categoryOffer, productOffer);
//             let displayPrice = product.SalePrice;
//             let offerPrice = null;

//             if (highestOffer > 0) {
//                 const discount = (highestOffer / 100) * product.SalePrice;
//                 const offerPriceRaw = product.SalePrice - discount;
//                 offerPrice = roundToNearest5or10(offerPriceRaw);
//             }
//             displayPrice = roundToNearest5or10(product.SalePrice);

//             return {
//                 ...product.toObject(),
//                 displayPrice,
//                 offerPrice,
//                 appliedOffer: highestOffer
//             };
//         });

//         // Fetch categories and brands for filters
//         const categories = await Category.find();
//         const brands = await Brand.find();
        
//         res.render('shop', {
//             products,
//             categories,
//             brands,
//             totalProducts,
//             totalPages,
//             currentPage: parseInt(page),
//             query,
//             category,
//             brand,
//             priceRange,
//             sort
//         });
//     } catch (error) {
//         console.error('Error in /shop route:', error);
//         res.status(500).render('error', { message: 'Error loading shop page' });
//     }
// };

const productDetails = async (req, res) => {
    try {
        const userId = req.session.User;
        const userData = userId ? await User.findById(userId) : null;
       
        const productId = req.query.id;
        console.log(productId);
        
        if (!productId) {
            return res.redirect('/shop');
        }
    
        const productRaw = await Product.findById(productId).populate('Categorys');
        
        if (!productRaw) {
            return res.redirect('/pageNotFound');
        }
        
        // Function to round prices to nearest 5 or 10 (same as shop page)
        const roundToNearest5or10 = (num) => {
            const integerPart = Math.floor(num);
            const decimalPart = num - integerPart;
            if (decimalPart > 0.75) {
                return Math.ceil(num / 10) * 10; 
            } else {
                return Math.round(num / 5) * 5; 
            }
        };

        // Process main product for offer logic and rounded prices
        const categoryOffer = productRaw.Categorys ? productRaw.Categorys.CategoryOffer || 0 : 0;
        const productOffer = productRaw.ProductOffer || 0;
        const highestOffer = Math.max(categoryOffer, productOffer);
        let displayPrice = productRaw.SalePrice;
        let offerPrice = null;

        if (highestOffer > 0) {
            const discount = (highestOffer / 100) * productRaw.SalePrice;
            const offerPriceRaw = productRaw.SalePrice - discount;
            offerPrice = roundToNearest5or10(offerPriceRaw);
        }
        displayPrice = roundToNearest5or10(productRaw.SalePrice);

        const product = {
            ...productRaw.toObject(),
            displayPrice,
            offerPrice,
            appliedOffer: highestOffer
        };

        // Fetch and process similar products
        const similarProductsRaw = await Product.find({
            $or: [
                { Brands: productRaw.Brands },
                { Categorys: productRaw.Categorys._id },
                { Colour: productRaw.Colour }
            ],
            _id: { $ne: productId },
            isBlocked: false,
            Status: "Available"
        }).populate('Categorys').limit(4);

        // Process similar products for offer logic and rounded prices
        const similarProducts = similarProductsRaw.map(prod => {
            const catOffer = prod.Categorys ? prod.Categorys.CategoryOffer || 0 : 0;
            const prodOffer = prod.ProductOffer || 0;
            const highOffer = Math.max(catOffer, prodOffer);
            let dispPrice = prod.SalePrice;
            let offPrice = null;

            if (highOffer > 0) {
                const discount = (highOffer / 100) * prod.SalePrice;
                const offPriceRaw = prod.SalePrice - discount;
                offPrice = roundToNearest5or10(offPriceRaw);
            }
            dispPrice = roundToNearest5or10(prod.SalePrice);

            return {
                ...prod.toObject(),
                displayPrice: dispPrice,
                offerPrice: offPrice,
                appliedOffer: highOffer
            };
        });
        
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
            totalOffer: highestOffer, // Kept for backward compatibility in EJS
            category: productRaw.Categorys,
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
        console.log("req", req.query);
        
        // Build the filter object
        const filter = { isBlocked: false }; // Add condition to exclude blocked products
        if (query) {
            filter.ProductName = { $regex: query, $options: 'i' };
        }
        if (category) {
            filter.Categorys = category;
        }
        
        // Get brand name using the brand ID
        if (brand) {
            const brandDoc = await Brand.findById(brand);
            if (brandDoc) {
                filter.Brands = brandDoc.BrandName; // Use brand name since Brands is stored as String
            }
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

        // Function to round prices to nearest 5 or 10 (same as home page)
        const roundToNearest5or10 = (num) => {
            const integerPart = Math.floor(num);
            const decimalPart = num - integerPart;
            if (decimalPart > 0.75) {
                return Math.ceil(num / 10) * 10; 
            } else {
                return Math.round(num / 5) * 5; 
            }
        };

        // Fetch products with filters, sorting, and pagination
        const productsRaw = await Product.find(filter)
            .sort(sortOptions)
            .skip(skip)
            .limit(limit)
            .populate('Categorys');

        // Process products to include offer logic and rounded prices
        const products = productsRaw.map(product => {
            const categoryOffer = product.Categorys?.CategoryOffer || 0;
            const productOffer = product.ProductOffer || 0;
            const highestOffer = Math.max(categoryOffer, productOffer);
            let displayPrice = product.SalePrice;
            let offerPrice = null;

            if (highestOffer > 0) {
                const discount = (highestOffer / 100) * product.SalePrice;
                const offerPriceRaw = product.SalePrice - discount;
                offerPrice = roundToNearest5or10(offerPriceRaw);
            }
            displayPrice = roundToNearest5or10(product.SalePrice);

            return {
                ...product.toObject(),
                displayPrice,
                offerPrice,
                appliedOffer: highestOffer
            };
        });

        // Fetch categories and brands for filters
        const categories = await Category.find();
        const brands = await Brand.find();
        
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