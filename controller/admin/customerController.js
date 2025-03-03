const User=require('../../models/userSchema')

const customerInfo= async (req,res)=>{
try {
    
    let search="";
    if(req.query.search){
        search=req.query.search;
    }
    let page=1;
    if(req.query.page){
        page=req.query.page
    }
    const limit=3
    const userData= await User.find({
        isAdmin:false,
        $or:[
            {FirstName:{$regex:".*"+search+".*"}},
            {LastName:{$regex:".*"+search+".*"}},
            {Email:{$regex:".*"+search+".*"}},
            {PhoneNumber:{$regex:".*"+search+".*"}}

        ],
    })
    .limit(limit*1)
    .skip((page-1)*limit)
    .exec()

    
    
    const count= await User.find({
        isAdmin:false,
        $or:[
            {FirstName:{$regex:".*"+search+".*"}},
            {LastName:{$regex:".*"+search+".*"}},
            {Email:{$regex:".*"+search+".*"}}
        ]
    }).countDocuments();

    const totalPages = Math.ceil(count / limit);

    res.render('customers', { data: userData,totalPages,currentPage:page}); 


} catch (error) {
    console.error("Error fetching customers:", error);
    res.status(500).send("Internal Server Error");
}
}


const customerBlocked= async (req,res)=>{
try {
    
    const { id, page } = req.query; 
    console.log("blocking user with ID:", id); 
    await User.updateOne({ _id: id }, { isBlocked: true });
    res.redirect(`/admin/users?page=${page || 1}`);
} catch (error) {
    res.redirect('/pageError')
}
}

const customerUnBlocked= async (req,res)=>{
    try {
        
        const { id, page } = req.query; 
        console.log("Unblocking user with ID:", id); 
        await User.updateOne({ _id: id }, { isBlocked:false });
        res.redirect(`/admin/users?page=${page || 1}`);
    } catch (error) {
        res.redirect('/pageError')
    }
    }


module.exports={
    customerInfo,
    customerUnBlocked,
    customerBlocked
}