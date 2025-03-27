const Coupon = require('../../models/couponSchma');
const User = require('../../models/userSchema');
const mongoose = require('mongoose');

const loadCoupon = async (req, res) => {
    try {
        const findCoupon = await Coupon.find({});
        console.log(findCoupon);
        
        const users = await User.find({ isBlocked: false }, 'Email _id'); // Still fetch users for display purposes
        res.render('admin-coupon', {
            coupons: findCoupon,
            users: users
        });
    } catch (error) {
        console.error('Error In Loading Coupon:', error);
        res.redirect('/pageError');
    }
};

const createCoupon = async (req, res) => {
    try {
        console.log("Received form data:", req.body);

        let startDate = new Date(req.body.startDate);
        let expiryDate = new Date(req.body.expiryDate);

        if (isNaN(startDate.getTime()) || isNaN(expiryDate.getTime())) {
            return res.status(400).json({ message: "Invalid date format" });
        }

        const newCoupon = new Coupon({
            Name: req.body.couponCode,
            OfferPrice: parseInt(req.body.discount),
            MinimumPrice: parseInt(req.body.minPrice),
            CreatedOn: startDate,
            ExpiryOn: expiryDate,
            isListed: true,
            couponType: req.body.couponType || 'general'
        });

        await newCoupon.save();

        if (req.xhr || req.get('Content-Type') === 'application/json') {
            return res.status(200).json({ message: "Coupon created successfully" });
        } else {
            return res.redirect("/admin/coupon");
        }
    } catch (error) {
        console.error('Error creating coupon:', error);
        return res.status(500).json({ message: error.message || "An error occurred while creating the coupon" });
    }
};

const editCoupon = async (req, res) => {
    try {
        const id = req.query.id;
        const findCoupon = await Coupon.findOne({ _id: id });
        res.render('edit-coupon', {
            coupon: findCoupon
        });
    } catch (error) {
        console.error('Error loading edit coupon:', error);
        res.redirect('/pageError');
    }
};

const updateCoupon = async (req, res) => {
    try {
        const couponId = req.body.couponId;
        const existingCoupon = await Coupon.findOne({ Name: req.body.couponCode, _id: { $ne: couponId } });

        if (existingCoupon) {
            return res.status(400).json({ message: 'Coupon code already exists' });
        }

        let startDate = new Date(req.body.startDate);
        let expiryDate = new Date(req.body.expiryDate);

        if (isNaN(startDate.getTime()) || isNaN(expiryDate.getTime())) {
            return res.status(400).json({ message: 'Invalid date format' });
        }

        const updatedCoupon = await Coupon.findByIdAndUpdate(
            couponId,
            {
                Name: req.body.couponCode,
                OfferPrice: parseInt(req.body.discount),
                MinimumPrice: parseInt(req.body.minPrice),
                CreatedOn: startDate,
                ExpiryOn: expiryDate,
                isListed: req.body.status === 'true',
                couponType: req.body.couponType || 'general'
            },
            { new: true }
        );

        if (!updatedCoupon) {
            return res.status(404).json({ message: 'Coupon not found' });
        }

        if (req.xhr || req.get('Content-Type') === 'application/json') {
            return res.status(200).json({ message: 'Coupon updated successfully' });
        } else {
            return res.redirect('/admin/coupon');
        }
    } catch (error) {
        console.error('Error updating coupon:', error);
        return res.status(500).json({ message: error.message || 'An error occurred while updating the coupon' });
    }
};

const deleteCoupon = async (req, res) => {
    try {
        const couponId = req.query.id;
        await Coupon.deleteOne({ _id: couponId });
        res.status(200).send({ success: true, message: "Coupon Deleted Successfully" });
    } catch (error) {
        console.error('Error Delete coupon:', error);
        return res.status(500).send({ success: false, message: error.message || 'An error occurred while Deleting the coupon' });
    }
};

module.exports = {
    loadCoupon,
    createCoupon,
    editCoupon,
    updateCoupon,
    deleteCoupon
};