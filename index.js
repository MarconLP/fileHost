const express = require('express'),
    app = express(),
    path = require('path'),
    port = 3000,
    http = require('http'),
    fs = require('fs'),
    multer = require('multer'),
    uuid = require('uuid').v4,
    mongoose = require('mongoose'),
    methodOverride = require('method-override')

const upload_uuid = uuid()

const upload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, 'uploads')
        },
        filename: (req, file, cb) => {
            const {originalname} = file
            cb(null, `${upload_uuid}-${originalname}`)
        }
    })
})

// MONGO CONNECTION
mongoose.connect('mongodb://localhost:27017/fileHost', {useNewUrlParser: true, useUnifiedTopology: true})
    .then(() => {
        console.log('connected to database')
    })
    .catch(err => {
        console.log(err)
    })

const schema = new mongoose.Schema({
    upload_id: String,
    uuid: String,
    file: String,
    status: String,
    time: Number,
    time_expire: Number,
    size: Number,
    ip:  String,
    password:  String,
    destruct: String, // false, downloads, time
    downloads: Array
})

const Upload = mongoose.model('Upload', schema)

app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'ejs')

app.use(methodOverride('_method'))
app.use(express.static(path.join(__dirname, 'public')))
app.use(express.urlencoded({ extended: true }))

app.listen(port, '0.0.0.0', () => {
    console.log(`Listening on port ${port}`)
})

function genData(id, filename, size, ip, password) {
    return data = {
        upload_id: id,
        uuid: upload_uuid,
        file: filename,
        status: "ready", // processing, ready, deleted
        time: new Date().getTime(),
        time_expire: new Date().getTime(),
        size: size,
        ip: ip,
        password: password,
        destruct: false, // false, downloads, time
        downloads: []
        //     {
        //         time: 1600011224,
        //         ip: '0.0.0.0'
        //     }
        // ]
    }
}

function genID() {
    const chars = "qwertzuiopasdfghjklyxcvbnmQWERTZUIOASDFGHJKLYXCVBNM1234567890"
    let id = ""
    while (true) {
        id += chars[Math.floor(Math.random() * chars.length)]
        // TODO: Add database check instead of 1+1=2
        if (id.length >= 6 && 1+1===2) {
            return id
        }
    }
}

app.get('/', (req, res) => {
    res.render('index')
})

app.post('/', upload.single('file'), (req, res) => {
    const { password } = req.body
    const { originalname, size } = req.file
    const data = genData(genID(), originalname, size, req.ip, password)
    Upload.create(data)
        .catch(err => console.log(err))
    res.redirect(`/file/${data.upload_id}`)
})

app.get('/uploaded', (req, res) => {
    res.send('working')
})

app.get('/file/:id', (req, res) => {
    const { id } = req.params
    const { password } = req.body
    Upload.find({ upload_id: id })
        .then(data => {
            res.render('download', { data: data[0], password })
        })
})

app.get('/start/:id', (req, res) => {
    const { id } = req.params
    const { password } = req.body
    Upload.find({upload_id: id})
        .then(data => {
            console.log(password)
            if (password === data[0].password) {
                const file = path.join(__dirname, `/uploads/${data[0].uuid}-${data[0].file}`)
                res.download(file, data[0].file)
            } else {
                res.send('wrong password')
            }
        })

})

app.delete('/:id', (req, res) => {
    const { id } = req.params
    Upload.findOneAndDelete({ upload_id: id }, (err, doc, result) => {
        if (err) console.log(err);
        fs.unlink(path.join(__dirname, `/uploads/${doc.uuid}-${doc.file}`), err => {
            if (err) console.log(err)
        })
        res.redirect(`/file/${ id }`)
    });
})

