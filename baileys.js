"use strict"

const { default: makeWASocket, DisconnectReason, useMultiFileAuthState, delay } = require('baileys')
const pino = require('pino')
const { rm } = require("fs");

const sendMessageWTyping = async(sock, msg, jid) => {
	await sock.presenceSubscribe(jid)
	await delay(500)

	await sock.sendPresenceUpdate('composing', jid)
	await delay(2000)

	await sock.sendPresenceUpdate('paused', jid)

	await sock.sendMessage(jid, msg)
}

const baileys = async (wa, updateQR) => {
  const {state, saveCreds} = await useMultiFileAuthState('session')

  const sock = makeWASocket({
    printQRInTerminal: true,
    browser: ["Wabill", "Chrome", "1.1.0"],
    logger: pino({
      level: 'error'
    }),
    auth: state
  })

  sock.ev.process(
		async(events) => {
			if(events['connection.update']) {
				const update = events['connection.update']
				console.log(update)
				const { connection, lastDisconnect } = update
				if(connection === 'close') {
					if(lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) {
						baileys(wa, updateQR)
					} else {
            console.log('Connection closed. You are logged out.')
            rm("./session", { recursive: true }, (err) => {
              if (err && err.code == "ENOENT") {
                // file doens't exist
                console.info("Folder doesn't exist, won't remove it.");
              } else if (err) {
                console.error("Error occurred while trying to remove folder.");
                console.error(err)
              }
            });
						baileys(wa, updateQR)
					}
				}

				// console.log('connection update', update)
        // console.log(JSON.stringify(update))
        updateQR(update)
			}

			if(events['creds.update']) {
				await saveCreds()
			}

			// if(events['messages.upsert']) {
			// 	const upsert = events['messages.upsert']
			// 	// console.log('recv messages ', JSON.stringify(upsert, undefined, 2))

			// 	if(upsert.type === 'notify') {
			// 		for(const msg of upsert.messages) {
			// 			if(!msg.key.fromMe && msg.key.remoteJid === "6281233745324@s.whatsapp.net") {
			// 				console.log('replying to', msg.key.remoteJid)
			// 				await sock.readMessages([msg.key])
			// 				await sendMessageWTyping(sock, { text: 'Hello there!' }, msg.key.remoteJid)
			// 			}
			// 		}
			// 	}
			// }
    }
  )

	return sock
}

module.exports = { baileys, sendMessageWTyping }