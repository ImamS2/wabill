const http = require("http")
const express = require("express")
const qrcode = require("qrcode")
const socketIO = require("socket.io")

const { baileys, sendMessageWTyping } = require("./original_baileys")
const { json } = require("express")
const { DisconnectReason } = require("baileys")

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
let retries = new Array

const updateQR = (data) => {
  const setQR = qr => {
    qrcode.toDataURL(qr, (err, url) => {
      sock?.emit("qr", url)
      sock?.emit("log", "QR Code received, please scan!")
    })
  }

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

const startBaileys = async () => {
  wa = await baileys(wa, updateQR)
}
startBaileys()

io.on("connection", async (socket) => {
  sock = socket

  // console.log(await wa.onWhatsApp())
  if (connected) {
    updateQR("connected")
  } else if (qr) updateQR('qr')
})

// send text message
const wabillSendMessage = async (res, message, number, fromRetries = false) => {
  // let to = number + "@s.whatsapp.net"
  // sendMessageWTyping(wa, { text: message }, to)
  //   .then((result) => {
  //     res.status(200).json({
  //       status: true,
  //       response: result,
  //     })
  //   })
  //   .catch(async (err) => {
  //     res.status(500).json({
  //       status: false,
  //       response: err,
  //     })

  //     // wa = await baileys(wa, updateQR)
  //     // startBaileys()
  //   })
  wa.onWhatsApp(number)
    .then(data => {
      if (data[0]?.jid) {
        sendMessageWTyping(wa, { text: message }, data[0].jid)
          .then((result) => {
            res.status(200).json({
              status: true,
              response: result,
            })

            if (fromRetries) retries.pop()
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
      console.log(data)
    })
    .catch(async err => {
      // console.error(err)
      if (err?.output?.statusCode === DisconnectReason.connectionClosed) {
        console.log('coba reconnect')
        // (async () => {
        //   wa = await baileys(wa, updateQR)
        // })()

        // baileys(wa, updateQR)
        // .then(waNew => {
        //   wa = waNew
        // })
        // .then(()=>{
        //   console.log('coba kirim ulang')
        //   // tungg udulu sampai ready, baru coba kirim ulang
        //   retries[0] = [res, message, number]
        // })
        // .catch(err => {
        //   console.error(err)
        // })
      }
    })
}

app.post("/send-message", async (req, res) => {
  // console.log(JSON.stringify(req.headers))
  // console.log(req)
  const message = req.body.message
  const number = req.body.number

  // console.log(wa.onWhatsApp())
  // return
  // console.log(await wa.onWhatsApp(number))
  if (connected) {
    wabillSendMessage(res, message, number)
    // try {
    //   console.log('nyoba ini')
    //   wabillSendMessage(res, message, number)
    // } catch (e) {
    //   console.log('error woi')
    //   if (e?.output?.statusCode === DisconnectReason.connectionClosed) {
    //     console.log('coba reconnect')
    //     wa = await baileys(wa, updateQR)
    //     console.log('coba kirim ulang')
    //     wabillSendMessage(res, message, number)
    //   }
    //   console.error(JSON.stringify(e))
    // }
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
