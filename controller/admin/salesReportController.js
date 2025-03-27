const Order = require('../../models/orderSchema');
const { Parser } = require('json2csv');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');

const getSalesReport = async (req, res) => {
    try {
        const { startDate, endDate, filter = 'all', page = 1, limit = 10 } = req.query;

        let dateFilter = {};

        if (startDate || endDate) {
            dateFilter.InvoiceDate = {};
            if (startDate) {
                const start = new Date(startDate);
                dateFilter.InvoiceDate.$gte = new Date(start.setHours(0, 0, 0, 0)); // Start of the day
            }
            if (endDate) {
                const end = new Date(endDate);
                if (startDate && startDate === endDate) {
                    // Same day: Set end to end of the day
                    dateFilter.InvoiceDate.$lte = new Date(end.setHours(23, 59, 59, 999));
                } else {
                    // Different days: Set end to end of the specified day
                    dateFilter.InvoiceDate.$lte = new Date(end.setHours(23, 59, 59, 999));
                }
            }
        } else if (filter !== 'all') {
            const now = new Date();
            switch (filter) {
                case 'daily':
                    dateFilter.InvoiceDate = {
                        $gte: new Date(now.setHours(0, 0, 0, 0)),
                        $lte: new Date(now.setHours(23, 59, 59, 999))
                    };
                    break;
                case 'weekly':
                    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
                    startOfWeek.setHours(0, 0, 0, 0);
                    const endOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 6));
                    endOfWeek.setHours(23, 59, 59, 999);
                    dateFilter.InvoiceDate = { $gte: startOfWeek, $lte: endOfWeek };
                    break;
                case 'monthly':
                    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
                    dateFilter.InvoiceDate = { $gte: startOfMonth, $lte: endOfMonth };
                    break;
            }
        }

        const orders = await Order.find(dateFilter)
            .populate('userId', 'FirstName')
            .sort({ InvoiceDate: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const totalOrders = await Order.countDocuments(dateFilter);
        const totalPages = Math.ceil(totalOrders / limit);
        const totalAmount = orders.reduce((sum, order) => {
            const grossAmount = (order.TotalPrice || 0) + (order.Tax || 0) - (order.Discount || 0);
            return sum + grossAmount;
        }, 0);

        res.status(200).render('salesReport', {
            orders,
            totalAmount,
            currentPage: parseInt(page),
            totalPages,
            filter,
            startDate,
            endDate,
            ordersCount: totalOrders
        });

    } catch (error) {
        console.error('Error fetching sales report:', error);
        res.status(500).render('error', {
            message: 'Failed to generate sales report',
            error: error.message
        });
    }
};

const downloadSalesReport = async (req, res) => {
    try {
        const { startDate, endDate, filter = 'all', page = 1, limit = 1000, format } = req.query;

        let dateFilter = {};

        if (startDate || endDate) {
            dateFilter.InvoiceDate = {};
            if (startDate) {
                const start = new Date(startDate);
                dateFilter.InvoiceDate.$gte = new Date(start.setHours(0, 0, 0, 0));
            }
            if (endDate) {
                const end = new Date(endDate);
                if (startDate && startDate === endDate) {
                    dateFilter.InvoiceDate.$lte = new Date(end.setHours(23, 59, 59, 999));
                } else {
                    dateFilter.InvoiceDate.$lte = new Date(end.setHours(23, 59, 59, 999));
                }
            }
        } else if (filter !== 'all') {
            const now = new Date();
            switch (filter) {
                case 'daily':
                    dateFilter.InvoiceDate = {
                        $gte: new Date(now.setHours(0, 0, 0, 0)),
                        $lte: new Date(now.setHours(23, 59, 59, 999))
                    };
                    break;
                case 'weekly':
                    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
                    startOfWeek.setHours(0, 0, 0, 0);
                    const endOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 6));
                    endOfWeek.setHours(23, 59, 59, 999);
                    dateFilter.InvoiceDate = { $gte: startOfWeek, $lte: endOfWeek };
                    break;
                case 'monthly':
                    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
                    dateFilter.InvoiceDate = { $gte: startOfMonth, $lte: endOfMonth };
                    break;
            }
        }

        // Filter for "Delivered" orders only
        dateFilter.Status = 'Delivered';

        const orders = await Order.find(dateFilter)
            .populate('userId', 'FirstName')
            .sort({ InvoiceDate: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        // Recalculate totals for "Delivered" orders only
        const deliveredOrdersCount = await Order.countDocuments(dateFilter);
        const deliveredTotalAmount = orders.reduce((sum, order) => {
            const grossAmount = (order.TotalPrice || 0) + (order.Tax || 0) - (order.Discount || 0);
            return sum + (grossAmount > 0 ? grossAmount : 0);
        }, 0);
        const deliveredTotalDiscount = orders.reduce((sum, order) => sum + (order.Discount || 0), 0);

        if (format === 'pdf') {
            const doc = new PDFDocument();
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'attachment; filename=sales_report.pdf');
            doc.pipe(res);

            // Add company name "SNEAKKISH"
            doc.font('Helvetica-Bold').fontSize(20).text('SNEAKKISH', { align: 'center' });
            doc.moveDown(0.5);

            // Add report title and generation date
            doc.fontSize(14).text('Sales Report (Delivered Items Only)', { align: 'center' });
            doc.fontSize(10).text(`Generated on: ${new Date().toLocaleDateString()}`, { align: 'center' });
            doc.moveDown(1);

            // Add summary
            doc.font('Helvetica').fontSize(12).text('Summary', { align: 'left' });
            doc.moveDown(0.5);
            doc.fontSize(10).text(`Total Orders with Delivered Items: ${deliveredOrdersCount}`, { align: 'left' });
            doc.text(`Total Revenue from Delivered Items: ${deliveredTotalAmount.toFixed(2)}`, { align: 'left' });
            doc.text(`Total Discount Given: ${deliveredTotalDiscount.toFixed(2)}`, { align: 'left' });
            doc.moveDown(1);

            // Add table header
            doc.fontSize(12).text(
                'Order ID    Date    Customer Name    Delivered    Discount    Revenue',
                { align: 'left' }
            );
            doc.moveDown(0.5);

            // Add detailed data in a structured table-like format
            orders.forEach((order) => {
                const grossAmount = (order.TotalPrice || 0) + (order.Tax || 0) - (order.Discount || 0);
                const deliveredCount = order.Items?.filter(item => item.status === 'Delivered').length || 0;
                const totalItems = order.Items?.length || 0;
                const revenueText = grossAmount > 0 ? grossAmount.toFixed(2) : '';
                const orderIdPadded = `ORD-${order.OrderId.padEnd(12)}`;
                const datePadded = order.InvoiceDate ? order.InvoiceDate.toLocaleDateString().padEnd(10) : 'N/A'.padEnd(10);
                const customerNamePadded = (order.userId?.FirstName || 'N/A').padEnd(14);
                const deliveredPadded = `${deliveredCount}/${totalItems}`.padEnd(10);
                const discountPadded = (order.Discount || 0).toFixed(2).padEnd(8);
                const revenuePadded = revenueText.padEnd(8);

                doc.fontSize(10).text(
                    `${orderIdPadded}    ${datePadded}    ${customerNamePadded}    ${deliveredPadded}    ${discountPadded}    ${revenuePadded}`,
                    { align: 'left' }
                );
                doc.moveDown(0.3);
            });

            doc.end();
        } else if (format === 'excel') {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Sales Report');

            // Add company name "SNEAKKISH"
            worksheet.addRow(['SNEAKKISH']).getCell(1, 1).font = { size: 20, bold: true };
            worksheet.mergeCells('A1:F1');
            worksheet.getCell('A1').alignment = { horizontal: 'center' };
            worksheet.addRow([]);

            // Add report title and generation date
            worksheet.addRow(['Sales Report (Delivered Items Only)']).getCell(3, 1).font = { size: 14, bold: true };
            worksheet.mergeCells('A3:F3');
            worksheet.getCell('A3').alignment = { horizontal: 'center' };
            worksheet.addRow([`Generated on: ${new Date().toLocaleDateString()}`]).getCell(4, 1).font = { size: 10 };
            worksheet.mergeCells('A4:F4');
            worksheet.getCell('A4').alignment = { horizontal: 'center' };
            worksheet.addRow([]);
            worksheet.addRow(['Summary']).getCell(6, 1).font = { size: 12, bold: true };
            worksheet.addRow([]);
            worksheet.addRow(['Total Orders with Delivered Items', deliveredOrdersCount]);
            worksheet.addRow(['Total Revenue from Delivered Items', deliveredTotalAmount.toFixed(2)]);
            worksheet.addRow(['Total Discount Given', deliveredTotalDiscount.toFixed(2)]);
            worksheet.addRow([]);

            // Add table header
            worksheet.addRow(['Order ID', 'Date', 'Customer Name', 'Delivered', 'Discount', 'Revenue']);

            // Add detailed data
            orders.forEach(order => {
                const grossAmount = (order.TotalPrice || 0) + (order.Tax || 0) - (order.Discount || 0);
                const deliveredCount = order.Items?.filter(item => item.status === 'Delivered').length || 0;
                const totalItems = order.Items?.length || 0;
                const revenueValue = grossAmount > 0 ? grossAmount.toFixed(2) : '';
                worksheet.addRow([
                    `ORD-${order.OrderId}`,
                    order.InvoiceDate ? order.InvoiceDate.toLocaleDateString() : 'N/A',
                    order.userId?.FirstName || 'N/A',
                    `${deliveredCount}/${totalItems}`,
                    (order.Discount || 0).toFixed(2),
                    revenueValue
                ]);
            });

            // Set column widths for better structure
            worksheet.getColumn(1).width = 15; // Order ID
            worksheet.getColumn(2).width = 12; // Date
            worksheet.getColumn(3).width = 15; // Customer Name
            worksheet.getColumn(4).width = 10; // Delivered
            worksheet.getColumn(5).width = 10; // Discount
            worksheet.getColumn(6).width = 10; // Revenue

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename=sales_report.xlsx');
            await workbook.xlsx.write(res);
            res.end();
        } else {
            const json2csvParser = new Parser({
                fields: ['OrderId', 'InvoiceDate', 'userId.FirstName', 'Delivered', 'Discount', 'Amount']
            });
            const csv = json2csvParser.parse(orders.map(order => {
                const grossAmount = (order.TotalPrice || 0) + (order.Tax || 0) - (order.Discount || 0);
                const deliveredCount = order.Items?.filter(item => item.status === 'Delivered').length || 0;
                const totalItems = order.Items?.length || 0;
                return {
                    OrderId: `ORD-${order.OrderId}`,
                    InvoiceDate: order.InvoiceDate ? order.InvoiceDate.toLocaleDateString() : 'N/A',
                    'userId.FirstName': order.userId?.FirstName || 'N/A',
                    Delivered: `${deliveredCount}/${totalItems}`,
                    Discount: (order.Discount || 0).toFixed(2),
                    Amount: grossAmount > 0 ? grossAmount.toFixed(2) : ''
                };
            }));

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=sales_report.csv');
            res.status(200).send(csv);
        }

    } catch (error) {
        console.error('Error generating download:', error);
        res.status(500).json({ error: 'Failed to generate download' });
    }
};



module.exports = { getSalesReport, downloadSalesReport };