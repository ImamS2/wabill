const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = require('@adiwajshing/baileys')
const pino = require('pino')
const { rm } = require("fs")

const sendMessageWTyping = async(sock, msg, jid) => {
	// await sock.presenceSubscribe(jid)
	// await delay(500)

	// await sock.sendPresenceUpdate('composing', jid)
	// await delay(2000)

	// await sock.sendPresenceUpdate('paused', jid)

	await sock.sendMessage(jid, msg)
}

const baileys = async (wa, updateQR) => {
  const { state, saveCreds } = await useMultiFileAuthState('original_session')

  const sock = makeWASocket({
    printQRInTerminal: true,
    browser: ["Wabill", "Chrome", "1.1.0"],
    logger: pino({
      level: 'error'
    }),
    auth: state
  })

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update
    if (connection === 'close') {
      var _a, _b
      const shouldReconnect = ((_b = (_a = lastDisconnect.error) === null || _a === void 0 ? void 0 : _a.output) === null || _b === void 0 ? void 0 : _b.statusCode) !== DisconnectReason.loggedOut
      if (shouldReconnect) {
        baileys(wa, updateQR)
      }
    } else if (connection === 'open') {
      console.log('opened connection')
    }

    updateQR(update)
  })

  sock.ev.on('creds.update', async () => {
    await saveCreds()
  })

  return sock
}

module.exports = { baileys, sendMessageWTyping }