const { uploadSchema } = require('./schemas/joiSchemas')
const AppError = require('./utils/AppError')

module.exports.validateUpload = (req, res, next) => {
    let { error } = uploadSchema.validate(req.body);
    if (error) {
        const msg = error.details.map(el => el.message).join(',')
        throw new AppError(msg, 400)
    } else {
        next()
    }
}