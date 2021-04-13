const Joi = require('joi')

module.exports.uploadSchema = Joi.object({
    passwordCheck: Joi.string().valid('on', 'off'),
    password: Joi.string(),
    maxDownloads: [Joi.number().integer().min(1), Joi.string().valid('')],
    storageTime: Joi.number().valid(300, 3600, 86400, 604800, 2628000).required(),
})
