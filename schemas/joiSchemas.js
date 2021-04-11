const Joi = require('joi')

module.exports.uploadSchema = Joi.object({
    upload: Joi.object({
        title: Joi.string()
            .max(125)
            .min(12)
            .required()
    }).required()
})
