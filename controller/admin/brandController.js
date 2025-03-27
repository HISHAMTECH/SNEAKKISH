const { TopologyType } = require('mongodb')
const brand = require('../../models/brandSchema')
const product = require('../../models/productSchema')
const sharp = require('sharp')
const path = require('path')
const fs = require('fs')

const getBrandPage = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1
        const limit = 4
        const skip = (page - 1) * limit
        const brandData = await brand.find({}).sort({ createdAt: -1 }).skip(skip).limit(limit)
        const totalBrands = await brand.countDocuments()
        const totalPages = Math.ceil(totalBrands / limit)
        const reverseBrand = brandData.reverse()
        res.render("brands", {
            data: reverseBrand,
            currentPage: page,
            totalPages: totalPages,
            totalBrands: totalBrands,
        })
    } catch (error) {
        console.error("Error in getBrandPage:", error)
        res.redirect('/pageError')
    }
}

const checkBrand = async (req, res) => {
    try {
        const brandName = req.query.name.trim().toLowerCase()
        const existingBrand = await brand.findOne({ 
            BrandName: { $regex: `^${brandName}$`, $options: "i" } 
        })
        res.json({ exists: !!existingBrand })
    } catch (error) {
        console.error("Error checking brand:", error)
        res.status(500).json({ error: "Internal Server Error" })
    }
}

const addBrand = async (req, res) => {
    try {
        // Input validation
        if (!req.body.name || !req.file) {
            return res.status(400).json({ 
                error: "Brand name and image are required" 
            })
        }

        const brandName = req.body.name.trim()
      
        

        // Check if brand already exists
        const existingBrand = await brand.findOne({ 
            BrandName: { $regex: `^${brandName}$`, $options: "i" } 
        })

        if (existingBrand) {
            return res.status(409).json({ 
                error: "Brand already exists" 
            })
        }

        // Process image
        const imagePath = req.file.path
        const processedImageName = `processed_${Date.now()}_${path.basename(req.file.filename)}`
        const processedImagePath = path.join('public', 'uploads', 're-image', processedImageName)

        await sharp(imagePath)
            .resize(500, 500, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
            .toFile(processedImagePath)

        // Create new brand
        const newBrand = new brand({
            BrandName: brandName,
            BrandImage: [processedImageName],
            isBlocked: false
        })

        await newBrand.save()

        // Clean up original image
        fs.unlink(imagePath, (err) => {
            if (err) console.error("Error deleting original image:", err)
        })

        res.status(201).json({ 
            message: "Brand added successfully",
            brand: newBrand 
        })

    } catch (error) {
        console.error("Error adding brand:", error)
        res.status(500).json({ error: "Internal Server Error" })
    }
}

const deleteBrand = async (req, res) => {
    try {
        const { id } = req.query

        if (!id) {
            return res.status(400).redirect('/pageError')
        }

        // Find brand to get image filename
        const brandToDelete = await brand.findById(id)
        if (!brandToDelete) {
            return res.status(404).redirect('/pageError')
        }

        // Delete brand image
        if (brandToDelete.BrandImage && brandToDelete.BrandImage.length > 0) {
            const imagePath = path.join('public', 'uploads', 're-image', brandToDelete.BrandImage[0])
            fs.unlink(imagePath, (err) => {
                if (err) console.error("Error deleting brand image:", err)
            })
        }

        // Check if brand is used in any products
        const productsWithBrand = await product.findOne({ brand: id })
        if (productsWithBrand) {
            return res.status(400).json({
                error: "Cannot delete brand as it is associated with existing products"
            })
        }

        await brand.deleteOne({ _id: id })
        res.redirect('/admin/brands')

    } catch (error) {
        console.error("Error Deleting Brand:", error)
        res.status(500).redirect('/pageError')
    }
}

const blockBrand = async (req, res) => {
    try {
        const id = req.query.id
        if (!id) {
            return res.status(400).redirect('/pageError')
        }
        await brand.updateOne({ _id: id }, { $set: { isBlocked: true } })
        res.redirect('/admin/brands')
    } catch (error) {
        console.error("Error blocking brand:", error)
        res.redirect('/pageError')
    }
}

const unBlockBrand = async (req, res) => {
    try {
        const id = req.query.id
        if (!id) {
            return res.status(400).redirect('/pageError')
        }
        await brand.updateOne({ _id: id }, { $set: { isBlocked: false } })
        res.redirect('/admin/brands')
    } catch (error) {
        console.error("Error unblocking brand:", error)
        res.redirect('/pageError')
    }
}

module.exports = {
    getBrandPage,
    checkBrand,
    addBrand,
    blockBrand,
    unBlockBrand,
    deleteBrand
}