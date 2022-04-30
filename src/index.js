import dotenv from 'dotenv'

import {createServer} from 'http'
//import fs from 'fs'
import {Server} from 'socket.io'

import {Room, Member} from './rooms.js'

import NodeCache from 'node-cache'


dotenv.config()
/*
const options = {
	key: fs.readFileSync(process.env.sslKeyFile),
	cert: fs.readFileSync(process.env.sslCertFile),
};*/

const persons = new NodeCache();
const rooms = new NodeCache();

var server = createServer((req, res) => {
	console.log(req.url)
})

const io = new Server(server)

io.on('connection', sock => {
	console.log("new connection")
	io.send("welcome")

	/*
	 * arriva connection, contiene già codice del qr
	 *
	 * controlla se già in persons, se si lo ributta nella sua stanza,
	 * altrimenti guarda se ce n'è una vuota, e se non c'è la crea
	 *
	 * quando room arriva a tot partecipanti, status filling -> searching,
	 * manda messaggio di partenza, i frontend iniziano a inviare posizioni,
	 * le salviamo in cache e le distribuiamo agli altri
	 *
	 * quando si incontrano status searching -> ready e poi playing
	 * (se non c'è step in mezzo si può saltare), gioco comincia
	 *
	 * a gioco finito la room viene cancellata e anche i partecipanti vengono rimossi dalla lista
	 *
	 */

	io.on("message", msg => {
		console.log("recived ", msg)
	})
})

server.listen(process.env.port, ()=>console.log("server listening"))
