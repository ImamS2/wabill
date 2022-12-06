const http = require("http")
const express = require("express")
const qrcode = require("qrcode")
const socketIO = require("socket.io")

const { baileys, sendMessageWTyping } = require("./baileys")
const { json } = require("express")

const port = 8000 || process.env.PORT
const app = express()
const server = http.createServer(app)
const io = socketIO(server)

app.use(express.json())
app.use("/assets", express.static(__dirname + "/client/assets"))

app.get("/", (req, res) => {
  res.sendFile("./client/index.html", {
    root: __dirname,
  })
})

let wa
let sock
let qr
let connected

const updateQR = (data) => {
  const setQR = qr => {
    qrcode.toDataURL(qr, (err, url) => {
      sock?.emit("qr", url)
      sock?.emit("log", "QR Code received, please scan!")
    })
  }

  // console.log('qr: ' + data.qr)
  // console.log('connection: ' + data.connection)
  if (data.qr) {
    qr = data.qr
    setQR(qr)
  }

  if (data === 'qr') {
    setQR(qr)
  }

  if (data.connection === 'open' || data === 'connected') {
    connected = true
    sock?.emit("qrstatus", "./assets/check.svg")
    sock?.emit("log", "WhatsApp terhubung!")
  }
  
  if (data.connection === 'close') {
    connected = false
    sock?.emit("qrstatus", "./assets/loader.gif")
  }
}

(async() => {
  wa = await baileys(wa, updateQR)
})()

io.on("connection", async (socket) => {
  sock = socket

  // console.log(await wa.onWhatsApp())
  if (connected) {
    updateQR("connected")
  } else if (qr) updateQR('qr')
})

// send text message
app.post("/send-message", async (req, res) => {
  // console.log(JSON.stringify(req.headers))
  // console.log(req)
  const message = req.body.message
  const number = req.body.number

  // console.log(wa.onWhatsApp())
  // return
  // console.log(await wa.onWhatsApp(number))
  if (connected) {
    const exists = await wa.onWhatsApp(number)
    if (exists?.jid || (exists && exists[0]?.jid)) {
      sendMessageWTyping(wa, { text: message }, exists.jid || exists[0].jid)
        .then((result) => {
          res.status(200).json({
            status: true,
            response: result,
          })
        })
        .catch((err) => {
          res.status(500).json({
            status: false,
            response: err,
          })
        })
    } else {
      res.status(500).json({
        status: false,
        response: `Nomor ${number} tidak terdaftar.`,
      })
    }
  } else {
    res.status(500).json({
      status: false,
      response: `WhatsApp belum terhubung.`,
    })
  }
})

server.listen(port, () => {
  console.log(`Aplikasi berjalan di http://localhost:${port}`)
})
