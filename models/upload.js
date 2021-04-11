const mongoose = require('mongoose')
const Schema = mongoose.Schema

const uploadSchema = new Schema({
    upload_id: {
        type: String,
        required: true
    },
    uuid: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    status: {
        type: String,
        required: true
    },
    time: {
        type: Number,
        required: true
    },
    time_expire: {
        type: Number,
        required: true
    },
    size: {
        type: Number,
        required: true
    },
    ip: {
        type: String,
        required: true
    },
    owner: {
        type: String,
        required: true
    },
    password: {
        type: String,
    },
    // destruct: {
    //     type: String,
    // },
    downloads: {
        type: Array,
    },
    access: {
        type: Array
    }
})

module.exports = mongoose.model('Upload', uploadSchema)

