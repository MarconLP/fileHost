const express = require('express')
const AppError = require('../utils/AppError')
const wrapAsync = require('../utils/wrapAsync')
const router = express.Router()
const path = require('path')
const Upload = require('../models/upload')
const fs = require('fs')

router.use('/:id', wrapAsync( async (req, res, next) => {
    const { id } = req.params
    const upload = await Upload.findOne({ upload_id: id })
    if (!upload) throw new AppError('Not Found', 404)
    if (!(upload.password === '' || upload.access.includes(req.signedCookies.token) || upload.owner === req.signedCookies.token))
        res.render('file/password', { upload, wrong: false })
    if ((upload.max_downloads !== null && upload.downloads.length >= upload.max_downloads) || upload.downloads.length >= 50)
        throw new AppError('too many downloads', 403)
    if ((upload.time + (upload.time_expire * 1000)) < new Date().getTime()) {
        throw new AppError('expired', 410)
    }
    res.locals.upload = upload
    res.locals.id = id
    next()
}))

router.get('/:id', wrapAsync( async (req, res) => {
    const upload = res.locals.upload
    res.render('file/show', { upload, owner: (upload.owner === req.signedCookies.token) })
}))

router.get('/:id/start', wrapAsync(async (req, res) => {
    res.render('file/download', {upload: res.locals.upload})
}))

router.get('/:id/download', wrapAsync(async (req, res) => {
    const upload = res.locals.upload
    upload.downloads.push({ ip: req.connection.remoteAddress, date: new Date().getTime() })
    await upload.save()
    const file = path.join(__dirname, `../uploads/${upload.uuid}`)
    res.download(file, upload.name)
}))

router.delete('/:id', wrapAsync(async (req, res) => {
    const id = res.locals.id
    Upload.findOneAndDelete({ upload_id: id }, (err, doc, result) => {
        if (err) console.log(err);
        fs.unlink(path.join(__dirname, `../uploads/${doc.uuid}`), err => {
            if (err) console.log(err)
        })
        res.redirect(`/file/${id}`)
    })
}))

module.exports = router
