// 404 Handler
exports.pageNotFound = (req, res, next) => {
    res.status(404).render('errors/page-404', {
        url: req.originalUrl,
        title: 'Page Not Found'
    });
};

// General Error Handler
exports.errorHandler = (err, req, res, next) => {
    console.error(err.stack); // Log error for debugging
    res.status(500).render('errors/error', {
        title: 'Server Error',
        error: 'Something went wrong!'
    });
};