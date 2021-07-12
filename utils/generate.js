module.exports.genData = (upload_uuid, uploadId, filename, size, password, req, maxDownloads, time_expire) => {
    return data = {
        upload_id: uploadId,
        uuid: upload_uuid,
        name: filename,
        status: "ready", // processing, ready, deleted
        time: new Date().getTime(),
        time_expire: time_expire,
        max_downloads: maxDownloads,
        size: size,
        ip: req.connection.remoteAddress,
        owner: req.signedCookies.token,
        password: password,
        downloads: [],
        access: []
    }
}

module.exports.genID = (length) => {
    const chars = "qwertzuiopasdfghjklyxcvbnmQWERTZUIOASDFGHJKLYXCVBNM1234567890"
    let id = ""
    while (true) {
        id += chars[Math.floor(Math.random() * chars.length)]
        if (id.length >= length) {
            return id
        }
    }
}