/**
 * GET /
 * root page.
 */
exports.get = (req, res) => {
    //if (req.user) {
    res.render('pages/root', {
        title: 'Home'
    });
    //} else {
    //    return res.redirect('/about/');
    //}
};