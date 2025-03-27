const User=require('../../models/userSchema')
const Category=require("../../models/CategorySchema")
const Product=require('../../models/productSchema')
const Brand=require('../../models/brandSchema')
const Coupon=require('../../models/couponSchma')


const loadCoupon = async (req, res) => {
    try {
      const userId = req.session.User;
      if (!userId) {
        console.log('No user ID in session, redirecting to login');
        return res.redirect('/login');
      }
  
      console.log('Current User ID:', userId);
  
      // Fetch general coupons (available to all)
      const generalCoupons = await Coupon.find({
        couponType: 'general',
        isListed: true,
        ExpiryOn: { $gt: new Date() }
      });
      console.log('General Coupons Found:', generalCoupons.length, generalCoupons);
  
      // Fetch referral coupons where this user's ID is in assignedUsers
      const referralCoupons = await Coupon.find({
        couponType: 'referral',
        assignedUsers: userId, // Check if userId is in the assignedUsers array
        isListed: true,
        ExpiryOn: { $gt: new Date() }
        // Removed usage limit check; add back if needed: $expr: { $lt: ['$timesUsed', '$usageLimit'] }
      }).populate('assignedUsers');
      console.log('Referral Coupons Found:', referralCoupons.length, referralCoupons);
  
      // Combine all coupons
      const couponData = [...generalCoupons, ...referralCoupons];
      console.log('Total Coupons to Render:', couponData.length, couponData);
  
      res.render('coupon', {
        coupon: couponData
      });
    } catch (error) {
      console.error('Error In Loading Coupon:', error);
      res.redirect('/pageNotFound');
    }
  };




const removeCoupon = async (req, res) => {
  try {
      const couponId = req.params.couponId;
      const userId = req.session.User;

      if (!userId) {
          return res.status(401).json({ success: false, message: 'User not authenticated' });
      }

      const coupon = await Coupon.findById(couponId);
      if (!coupon) {
          return res.status(404).json({ success: false, message: 'Coupon not found' });
      }

      const userIndex = coupon.assignedUsers.indexOf(userId);
      if (userIndex > -1) {
          coupon.assignedUsers.splice(userIndex, 1);
          await coupon.save();
          return res.json({ success: true, message: 'Coupon removed from your list' });
      }

      return res.json({ success: true, message: 'Coupon was not associated with you' });
  } catch (error) {
      console.error('Error removing coupon:', error.message, error.stack);
      res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

module.exports={
    loadCoupon,
    removeCoupon
}