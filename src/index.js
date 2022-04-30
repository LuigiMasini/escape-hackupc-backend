import dotenv from 'dotenv'

import {createServer} from 'http'
import fs from 'fs'
import {Server} from 'socket.io'

import {Room, Member} from './rooms.js'

import NodeCache from 'node-cache'


dotenv.config()
/*
const options = {
	key: fs.readFileSync(process.env.sslKeyFile),
	cert: fs.readFileSync(process.env.sslCertFile),
};*/


const DATA = fs.readFileSync(process.env.dataFile)


const persons = new NodeCache();
const rooms = new NodeCache();

var fillingRoomId

var server = createServer((req, res) => {
	console.log(req.url)
})

const io = new Server(server, {
	cors:{
		origins:["*"],
		handlePreflightRequest: (req, res) => {
			res.writeHead(200, {
				"Access-Control-Allow-Origin": "*",
				"Access-Control-Allow-Methods": "GET,POST",
			})
			res.end()
		}
	}
})

io.on('connection', sock => {
	console.log("new connection, ", sock.id)

	sock.send("welcome")

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

	sock.on("register", ({id}) => {

		if (persons.has(id)) {
			sock.send("Error: you are still playing on another device")
			sock.disconnect(true)
			return
		}

		sock.data.userId = id
		let person = new Member(id, sock.id)

		var room, roomId

		//add to existing room
		if (!!fillingRoomId && rooms.get(fillingRoomId).members.length < 4) {
			roomId = fillingRoomId
			room = rooms.get(fillingRoomId)
			room.addMember(id)
		}
		else {	//create new room
			roomId = (new Date()).getTime()
			room = new Room (roomId)
		}

		sock.join(roomId)
		person.roomId = roomId

		//start when room full
		if (room.members.length >= 4){
			fillingRoomId = undefined;
			room.status = "searching"

			io.to(roomId).emit("status","searching")
		}

		persons.set(id, person)
		rooms.set(roomId, room)

	})


	sock.on("locUpdate", geolocation => {

		var person = persons.get(sock.data.userId)
		person.geolocation = geolocation
		persons.set(sock.data.userId, person)

		//TODO calculate distance
		const distance = 0;	//WARNING tmp to skip searching phase

		io.to(person.roomId).emit("distance", distance)

	})

	sock.on("rotate", isHorizontal => {

		var person = persons.get(sock.data.userId)
		person.ready = isHorizontal
		persons.set(sock.data.userId, person)

		var room = rooms.get(person.roomId)
		room.ready++
		rooms.set(person.roomId, room)

		if (room.ready >=4){
			room.status = 'ready'
			rooms.set(person.roomId, room)
			io.to(room.id).emit("status", "ready")


			//assign questions & items

			var objects = DATA.objects
			var items = DATA.items

			room.members.forEach(userId => {

				var person = persons.get(userId)

				person.objects = getRandom(objects, 5)
				objects = objects.filter(item => !person.objects.includes(item));

				person.items = getRandom(items, 5)
				items = items.filter(item => !person.items.includes(item));

				persons.set(userId,  person)

			})

			room.status = 'playing'
			rooms.set(room.id, room)
			io.to(room.id).emit("status", "playing")
		}
	})


	sock.on("solved", num => {

		const roomId = persons.get(sock.data.userId).roomId
		var room = rooms.get(roomId)
		room.solved.push(num)

		if (room.solved.length >= 15){
			room.status = "ended"
			io.to(roomId).emit("status", "ended")
		}

		rooms.set(roomId, room)
	})

	sock.onAny((evento, arg1) => console.log(evento, arg1))
})

server.listen(process.env.port, ()=>console.log("server listening"))



function getRandom(arr, n) {
    var result = new Array(n),
        len = arr.length,
        taken = new Array(len);
    if (n > len)
        throw new RangeError("getRandom: more elements taken than available");
    while (n--) {
        var x = Math.floor(Math.random() * len);
        result[n] = arr[x in taken ? taken[x] : x];
        taken[x] = --len in taken ? taken[len] : len;
    }
    return result;
}

