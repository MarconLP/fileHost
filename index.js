const express = require('express'),
    app = express(),
    path = require('path'),
    port = 3000,
    multer = require('multer'),
    uuid = require('uuid').v4,
    mongoose = require('mongoose'),
    methodOverride = require('method-override'),
    cookieParser = require('cookie-parser'),
    session = require('express-session'),
    bodyParser = require('body-parser'),
    Upload = require('./models/upload'),
    wrapAsync = require('./utils/wrapAsync'),
    fileRoutes = require('./routes/file'),
    { genID, genData } = require('./utils/generate'),
    { validateUpload } = require('./middleware')

require('dotenv').config()
let upload_uuid

const upload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, 'uploads')
        },
        filename: (req, file, cb) => {
            upload_uuid = uuid()
            cb(null, upload_uuid)
        }
    }),
    limits: { fileSize: 1073741824 }
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

// app.use(session({ secret: process.env.SESSION_SECRET, resave: false, saveUninitialized: false, name: 'token',
//     cookie: { expires: new Date().getTime(new Date().getTime() + ( 2*60*60*1000 )) } }))
app.use(cookieParser(process.env.COOKIE_SECRET))
app.use(methodOverride('_method'))
app.use(express.static(path.join(__dirname, 'public')))
app.use(express.urlencoded({ extended: true }))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'))

app.use((req, res, next) => {
    if (!req.signedCookies.token) {
        const token = genID(64)
        res.cookie('token', token, { signed: true })
        req.signedCookies.token = token
    }
    next()
})

app.get('/', (req, res) => {
    res.render('index')
})

app.post('/', upload.single('file'), validateUpload, wrapAsync( async (req, res) => {
    let { password = '', maxDownloads = '', storageTime = '' } = req.body,
        { originalname, size } = req.file,
        uploadId = genID(6)
    const data = genData(upload_uuid, uploadId, originalname, size, password, req, maxDownloads, storageTime)
    await new Upload(data).save()
    res.redirect(`/file/${uploadId}`)
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

app.use('/file/:id', fileRoutes)

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

