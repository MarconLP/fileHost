const express = require('express'),
    app = express(),
    path = require('path'),
    port = 3000,
    http = require('http'),
    fs = require('fs'),
    multer = require('multer'),
    uuid = require('uuid').v4,
    mongoose = require('mongoose'),
    methodOverride = require('method-override'),
    cookieParser = require('cookie-parser'),
    session = require('express-session'),
    bodyParser = require('body-parser'),
    Upload = require('./models/upload'),
    AppError = require('./utils/AppError'),
    wrapAsync = require('./utils/wrapAsync'),
    { uploadSchema } = require('./schemas/joiSchemas')

require('dotenv').config()
const upload_uuid = uuid()

const upload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, 'uploads')
        },
        filename: (req, file, cb) => {
            // const { originalname } = file
            cb(null, upload_uuid)
        }
    })
})

mongoose.connect(`mongodb://${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
    .then(() => {
        console.log('connected to database')
    })
    .catch(err => {
        console.log(err)
    })

app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'ejs')

app.use(cookieParser(process.env.COOKIE_SECRET))
app.use(methodOverride('_method'))
app.use(express.static(path.join(__dirname, 'public')))
app.use(express.urlencoded({ extended: true }))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }));

const validateUpload = (req, res, next) => {
    let { error } = uploadSchema.validate(req.body);
    if (error) {
        const msg = error.details.map(el => el.message).join(',')
        throw new AppError(msg, 400)
    } else {
        next()
    }
}

app.use((req, res, next) => {
    if (!req.signedCookies.token) {
        const token = genID(64)
        res.cookie('token', token, { signed: true })
        req.signedCookies.token = token
    }
    next()
})

function genData(uploadId, filename, size, password, req) {
    return data = {
        upload_id: uploadId,
        uuid: upload_uuid,
        name: filename,
        status: "ready", // processing, ready, deleted
        time: new Date().getTime(),
        time_expire: new Date().getTime(),
        size: size,
        ip: req.connection.remoteAddress,
        owner: req.signedCookies.token,
        password: password,
        // destruct: false, // false, downloads, time
        downloads: [],
        access: []
    }
}

function genID(length) {
    const chars = "qwertzuiopasdfghjklyxcvbnmQWERTZUIOASDFGHJKLYXCVBNM1234567890"
    let id = ""
    while (true) {
        id += chars[Math.floor(Math.random() * chars.length)]
        if (id.length >= length) {
            return id
        }
    }
}

app.get('/', (req, res) => {
    res.render('index')
})

// validateUpload function add
app.post('/', upload.single('file'), wrapAsync( async (req, res) => {
    const { password } = req.body,
        { originalname, size } = req.file,
        uploadId = genID(6)
    const data = genData(uploadId, originalname, size, password, req)
    await new Upload(data).save()
    res.redirect(`/file/${uploadId}`)
}))

app.get('/file/:id', wrapAsync( async (req, res) => {
    const { id } = req.params
    const upload = await Upload.findOne({ upload_id: id })
    if (!upload) throw new AppError('Not Found', 404)
    if (upload.password === undefined || upload.access.includes(req.signedCookies.token) || upload.owner === req.signedCookies.token) {
        res.render('file/show', { upload, owner: (upload.owner === req.signedCookies.token) })
    } else {
        res.render('file/password', { upload, wrong: false })
    }
}))

app.post('/file/:id/pw', wrapAsync(async (req, res) => {
    const { password } = req.body
    const { id } = req.params
    const upload = await Upload.findOne({ upload_id: id })
    if (upload.password === password) {
        upload.access.push(req.signedCookies.token)
        await upload.save()
        res.redirect(`/file/${id}`)
    } else {
        res.render('file/password', { upload, wrong: true })
    }
}))

app.get('/file/:id/start', wrapAsync(async (req, res) => {
    const { id } = req.params
    const upload = await Upload.findOne({ upload_id: id })
    if (upload.password === undefined || upload.access.includes(req.signedCookies.token) || upload.owner === req.signedCookies.token) {
        res.render('file/download', {upload})
    } else {
        throw new AppError('Forbidden', 403)
    }
}))

app.get('/file/:id/download', wrapAsync(async (req, res) => {
    const { id } = req.params
    const upload = await Upload.findOne({ upload_id: id })
    if (upload.password === undefined || upload.access.includes(req.signedCookies.token) || upload.owner === req.signedCookies.token) {
        const file = path.join(__dirname, `/uploads/${upload.uuid}`)
        res.download(file, upload.name)
    } else {
        throw new AppError('Forbidden', 403)
    }
}))

app.delete('/file/:id', wrapAsync(async (req, res) => {
    const { id } = req.params
    const upload = await Upload.findOne({upload_id: id})
    if (upload.owner !== req.signedCookies.token) throw new AppError('Forbidden', 403)
    Upload.findOneAndDelete({ upload_id: id }, (err, doc, result) => {
        if (err) console.log(err);
        fs.unlink(path.join(__dirname, `/uploads/${doc.uuid}`), err => {
            if (err) console.log(err)
        })
        res.redirect(`/file/${id}`)
    })
}))

// app.post('/', upload.single('file'), (req, res) => {
//     const { password } = req.body
//     const { originalname, size } = req.file
//     req.session.token = uuid(64)
//     const data = genData(genID(6), originalname, size, req.ip, password)
//     Upload.create(data)
//         .catch(err => console.log(err))
//     res.redirect(`/file/${data.upload_id}`)
// })
//
// app.get('/file/:id', (req, res) => {
//     const { id } = req.params
//     const { password } = req.body
//     Upload.find({ upload_id: id })
//         .then(data => {
//             res.render('download', { data: data[0], password, token: req.session.token })
//         })
// })
//
// app.post('/file/:id', (req, res) => {
//     const { id } = req.params
//     const { password } = req.body
//     Upload.find({ upload_id: id })
//         .then(data => {
//             res.render('download', { data: data[0], password, token: req.session.token})
//         })
// })
//
// app.post('/start/:id', (req, res) => {
//     const { id } = req.params
//     Upload.find({upload_id: id})
//         .then(data => {
//             const file = path.join(__dirname, `/uploads/${data[0].uuid}-${data[0].file}`)
//             res.download(file, data[0].file)
//         })
//
// })
//
// app.delete('/:id', (req, res) => {
//     const { id } = req.params
//     Upload.findOneAndDelete({ upload_id: id }, (err, doc, result) => {
//         if (err) console.log(err);
//         fs.unlink(path.join(__dirname, `/uploads/${doc.uuid}-${doc.file}`), err => {
//             if (err) console.log(err)
//         })
//         res.redirect(`/file/${ id }`)
//     });
// })

// // TODO: CATCHING ERRORS // DONE
// app.all('*', (req, res, next) => {
//     next(new AppError('Page not found', 404))
// })
//
// app.use((err, req, res, next) => {
//     const { status = 500, message = 'Internal Server Error' } = err
//     res.status(status).render('error', { status, message })
// })

app.listen(port, '0.0.0.0', () => {
    console.log(`Listening on port ${port}`)
})

