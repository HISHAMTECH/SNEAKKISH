const User=require('../../models/userSchema')
const order=require('../../models/orderSchema')
const mongoose=require('mongoose')
const bcrypt=require('bcrypt')


const loadLogin= async (req,res)=>{

    try {
        
        
        if(req.session.admin){
            return res.redirect('/admin/')
        }else{
            res.render('admin-login',{message:null,})
        }
    } catch (error) {
        res.redirect('/PageError')
    }

}


const login = async (req, res) => {
    try {
        
        
        const { Email, Password } = req.body;
        const admin = await User.findOne({ Email, isAdmin: true });

        if (admin) {
            const passwordMatch = await bcrypt.compare(Password, admin.Password);
            if (passwordMatch) {
                req.session.admin = true; 
                console.log(req.session.admin);
                return res.redirect("/admin/"); 
            } else {
                return res.render("admin-login",{message:"Incorrect Password"}); 
            }
        } else {
            return res.render("admin-login",{message:"Not an Admin"});
        }
    } catch (error) {
        console.error("Login error", error);
        return res.redirect("/pageError"); 
    }
};


const loadDashboard = async (req, res) => {
    if (req.session.admin) {
        try {
            // Get filter from query (default to 'daily')
            const { filter = 'daily' } = req.query;

            // Define date range based on filter
            let dateFilter = {};
            const now = new Date();

            console.log('Filter applied:', filter); // Debug: Log the filter

            switch (filter) {
                case 'daily':
                    dateFilter = {
                        $gte: new Date(now.setHours(0, 0, 0, 0)),
                        $lte: new Date(now.setHours(23, 59, 59, 999))
                    };
                    break;
                case 'weekly':
                    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
                    startOfWeek.setHours(0, 0, 0, 0);
                    const endOfWeek = new Date(now.setDate(startOfWeek.getDate() + 6));
                    endOfWeek.setHours(23, 59, 59, 999);
                    dateFilter = { $gte: startOfWeek, $lte: endOfWeek };
                    break;
                case 'monthly':
                    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
                    dateFilter = { $gte: startOfMonth, $lte: endOfMonth };
                    break;
                case 'yearly':
                    const startOfYear = new Date(now.getFullYear(), 0, 1);
                    const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
                    dateFilter = { $gte: startOfYear, $lte: endOfYear };
                    break;
                default:
                    dateFilter = {
                        $gte: new Date(now.setHours(0, 0, 0, 0)),
                        $lte: new Date(now.setHours(23, 59, 59, 999))
                    };
            }

            console.log('Date filter:', dateFilter); // Debug: Log the date filter

            // Fetch orders within the date range and populate product details with nested Categorys
            const orders = await order.find({ InvoiceDate: dateFilter })
                .populate({
                    path: 'OrderedItems.Product',
                    populate: {
                        path: 'Categorys',
                        model: 'Category'
                    }
                })
                .populate('userId', 'FirstName');
            console.log('Orders fetched:', orders.length); // Debug: Log number of orders

            // Log the populated Product and Categorys data
            orders.forEach((order, index) => {
                if (order.OrderedItems && Array.isArray(order.OrderedItems)) {
                    order.OrderedItems.forEach((item, itemIndex) => {
                        console.log(`Order ${index + 1}, Item ${itemIndex + 1} - Product:`, {
                            Product: item.Product,
                            Categorys: item.Product?.Categorys
                        });
                    });
                } else {
                    console.log(`Order ${index + 1} has no OrderedItems or is not an array`);
                }
            });

            // Calculate total revenue for the stat card (using FinalAmount)
            const totalRevenue = orders.reduce((sum, order) => sum + (order.FinalAmount || 0), 0);

            // Calculate total orders (number of orders within the date filter)
            const totalOrders = orders.length;

            // Calculate total customers based on User schema (filter by CreatedOn and isAdmin: false)
            const totalCustomers = await User.countDocuments({
                CreatedOn: dateFilter,
                isAdmin: false
            });
            console.log('Total customers (based on User schema):', totalCustomers); // Debug: Log total customers

            // Prepare data for the revenue chart (e.g., revenue over time)
            let chartLabels = [];
            let chartData = [];

            if (filter === 'daily') {
                const hours = Array.from({ length: 24 }, (_, i) => i);
                chartLabels = hours.map(hour => `${hour}:00`);
                chartData = hours.map(hour => {
                    const startHour = new Date(dateFilter.$gte);
                    startHour.setHours(hour, 0, 0, 0);
                    const endHour = new Date(startHour);
                    endHour.setHours(hour, 59, 59, 999);
                    return orders
                        .filter(order => {
                            const orderDate = new Date(order.InvoiceDate);
                            return orderDate >= startHour && orderDate <= endHour;
                        })
                        .reduce((sum, order) => sum + (order.FinalAmount || 0), 0);
                });
            } else if (filter === 'weekly') {
                chartLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                chartData = chartLabels.map((_, index) => {
                    const day = new Date(dateFilter.$gte);
                    day.setDate(day.getDate() + index);
                    const startDay = new Date(day.setHours(0, 0, 0, 0));
                    const endDay = new Date(day.setHours(23, 59, 59, 999));
                    return orders
                        .filter(order => {
                            const orderDate = new Date(order.InvoiceDate);
                            return orderDate >= startDay && orderDate <= endDay;
                        })
                        .reduce((sum, order) => sum + (order.FinalAmount || 0), 0);
                });
            } else if (filter === 'monthly') {
                const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
                chartLabels = Array.from({ length: daysInMonth }, (_, i) => `${i + 1}`);
                chartData = chartLabels.map((_, index) => {
                    const day = new Date(dateFilter.$gte);
                    day.setDate(index + 1);
                    const startDay = new Date(day.setHours(0, 0, 0, 0));
                    const endDay = new Date(day.setHours(23, 59, 59, 999));
                    return orders
                        .filter(order => {
                            const orderDate = new Date(order.InvoiceDate);
                            return orderDate >= startDay && orderDate <= endDay;
                        })
                        .reduce((sum, order) => sum + (order.FinalAmount || 0), 0);
                });
            } else if (filter === 'yearly') {
                chartLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                chartData = chartLabels.map((_, index) => {
                    const startMonth = new Date(now.getFullYear(), index, 1);
                    const endMonth = new Date(now.getFullYear(), index + 1, 0, 23, 59, 59, 999);
                    return orders
                        .filter(order => {
                            const orderDate = new Date(order.InvoiceDate);
                            return orderDate >= startMonth && orderDate <= endMonth;
                        })
                        .reduce((sum, order) => sum + (order.FinalAmount || 0), 0);
                });
            }

            console.log('Chart labels:', chartLabels); // Debug: Log chart labels
            console.log('Chart data:', chartData); // Debug: Log chart data

            // Use the filtered orders for best-selling stats (instead of fetching all orders)
            // Best-selling products (Top 10)
            const productSales = {};
            orders.forEach(order => {
                if (order.OrderedItems && Array.isArray(order.OrderedItems)) {
                    order.OrderedItems.forEach(item => {
                        const product = item.Product;
                        if (product) {
                            const productId = product._id.toString();
                            if (!productSales[productId]) {
                                productSales[productId] = {
                                    name: product.ProductName || product.name || 'Unknown Product',
                                    quantity: 0,
                                    revenue: 0
                                };
                            }
                            productSales[productId].quantity += item.Quantity || 0;
                            productSales[productId].revenue += (item.Price || 0) * (item.Quantity || 0);
                        }
                    });
                }
            });

            const bestSellingProducts = Object.entries(productSales)
                .sort((a, b) => b[1].quantity - a[1].quantity)
                .slice(0, 10)
                .map(([_, data]) => ({
                    name: data.name,
                    quantity: data.quantity,
                    revenue: data.revenue.toFixed(2)
                }));

            console.log('Best-selling products (filtered):', bestSellingProducts); // Debug: Log best-selling products

            // Best-selling categories (Top 10)
            const categorySales = {};
            orders.forEach(order => {
                if (order.OrderedItems && Array.isArray(order.OrderedItems)) {
                    order.OrderedItems.forEach(item => {
                        const product = item.Product;
                        if (product && product.Categorys) {
                            const categoryId = product.Categorys._id.toString(); // Unique ID for the category
                            const categoryName = product.Categorys.Name || 'Unknown Category'; // Adjust 'name' based on your Category schema
                            if (!categorySales[categoryId]) {
                                categorySales[categoryId] = {
                                    name: categoryName,
                                    quantity: 0,
                                    revenue: 0
                                };
                            }
                            categorySales[categoryId].quantity += item.Quantity || 0;
                            categorySales[categoryId].revenue += (item.Price || 0) * (item.Quantity || 0);
                        } else {
                            // Fallback if Categorys is not populated
                            const categoryId = 'Unknown';
                            if (!categorySales[categoryId]) {
                                categorySales[categoryId] = {
                                    name: 'Unknown Category',
                                    quantity: 0,
                                    revenue: 0
                                };
                            }
                            categorySales[categoryId].quantity += item.Quantity || 0;
                            categorySales[categoryId].revenue += (item.Price || 0) * (item.Quantity || 0);
                        }
                    });
                }
            });

            const bestSellingCategories = Object.entries(categorySales)
                .sort((a, b) => b[1].quantity - a[1].quantity)
                .slice(0, 10)
                .map(([_, data]) => ({
                    name: data.name,
                    quantity: data.quantity,
                    revenue: data.revenue.toFixed(2)
                }));

            console.log('Best-selling categories (filtered):', bestSellingCategories); // Debug: Log best-selling categories

            // Best-selling brands (Top 10)
            const brandSales = {};
            orders.forEach(order => {
                if (order.OrderedItems && Array.isArray(order.OrderedItems)) {
                    order.OrderedItems.forEach(item => {
                        const product = item.Product;
                        const brand = product?.Brands || 'Unknown Brand';
                        if (!brandSales[brand]) {
                            brandSales[brand] = {
                                quantity: 0,
                                revenue: 0
                            };
                        }
                        brandSales[brand].quantity += item.Quantity || 0;
                        brandSales[brand].revenue += (item.Price || 0) * (item.Quantity || 0);
                    });
                }
            });

            const bestSellingBrands = Object.entries(brandSales)
                .sort((a, b) => b[1].quantity - a[1].quantity)
                .slice(0, 10)
                .map(([brand, data]) => ({
                    name: brand,
                    quantity: data.quantity,
                    revenue: data.revenue.toFixed(2)
                }));

            console.log('Best-selling brands (filtered):', bestSellingBrands); // Debug: Log best-selling brands

            // Fetch recent orders (e.g., last 3 for the recent orders table)
            const recentOrders = await order.find({ InvoiceDate: dateFilter })
                .populate({
                    path: 'OrderedItems.Product',
                    populate: {
                        path: 'Categorys',
                        model: 'Category'
                    }
                })
                .populate('userId', 'FirstName')
                .sort({ InvoiceDate: -1 })
                .limit(3);

            console.log('Recent orders:', recentOrders); // Debug: Log recent orders

            // Prepare graph data for Top Selling Categories (Pie Chart)
            const categoryChartData = {
                labels: bestSellingCategories.map(item => item.name),
                datasets: [{
                    data: bestSellingCategories.map(item => item.quantity),
                    backgroundColor: ['#ff6384', '#36a2eb', '#ffcd56', '#4bc0c0', '#9966ff', '#c9cbcf', '#ff9f40', '#ff6384', '#36a2eb', '#ffcd56'], // Dark theme colors
                    hoverOffset: 4
                }]
            };

            // Prepare graph data for Top Selling Products (Bar Chart)
            const productChartData = {
                labels: bestSellingProducts.map(item => item.name),
                datasets: [{
                    label: 'Units Sold',
                    data: bestSellingProducts.map(item => item.quantity),
                    backgroundColor: '#6b48ff', // Dark purple for blackish theme
                    borderColor: '#4b32cc',
                    borderWidth: 1
                }]
            };

            // Prepare graph data for Top Selling Brands (Bar Chart)
            const brandChartData = {
                labels: bestSellingBrands.map(item => item.name),
                datasets: [{
                    label: 'Units Sold',
                    data: bestSellingBrands.map(item => item.quantity),
                    backgroundColor: '#6b48ff', // Dark purple for blackish theme
                    borderColor: '#4b32cc',
                    borderWidth: 1
                }]
            };

            // Render the dashboard with the dynamic data
            res.render('dashboard', {
                totalRevenue,
                totalOrders,
                totalCustomers,
                chart: {
                    labels: chartLabels,
                    data: chartData,
                    filter: filter
                },
                categoryChart: categoryChartData,
                productChart: productChartData,
                brandChart: brandChartData,
                bestSellingProducts,
                bestSellingCategories,
                bestSellingBrands,
                recentOrders
            });
        } catch (error) {
            console.error('Error in loadDashboard:', error.message); // Debug: Log the error
            console.error('Stack trace:', error.stack); // Debug: Log the stack trace
            res.redirect('/PageError');
        }
    }
};

const pageError=async (req,res)=>{
    res.render("admin-page-404")
}


const logout= async(req,res)=>{
try {
   
        delete  req.session.admin
        
        res.redirect('/admin/login')

    
} catch (error) {
    console.log("Unexpected Error During Logout",error);
    res.redirect('/pageError')
}
}

module.exports={
    loadLogin,
    login,
    loadDashboard,
    pageError,
    logout,
    
}