import dotenv from 'dotenv'

import {createServer} from 'http'
import fs from 'fs'
import {Server} from 'socket.io'

import {Room, Member, wallImages} from './rooms.js'
import {getRandom} from './utils.js'

import NodeCache from 'node-cache'


const roomSize = 4

dotenv.config()
/*
const options = {
	key: fs.readFileSync(process.env.sslKeyFile),
	cert: fs.readFileSync(process.env.sslCertFile),
};*/

//serve static files
createServer(function (req, res) {
  fs.readFile('./assets'+req.url, function (err,data) {
    if (err) {
      res.writeHead(404);
      res.end(JSON.stringify(err));
      return;
    }
    res.writeHead(200);
    res.end(data);
  });
}).listen(8080);



const DATA = JSON.parse(fs.readFileSync(process.env.roomsDataFile))
const USERS = JSON.parse(fs.readFileSync(process.env.userDataFile))

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

	let updateLocationsTimeout

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

	sock.on("register", id => {

		/*
		if (persons.has(id)) {
			sock.send("Error: you are still playing on another device")
			sock.disconnect(true)
			return
		}
		*/

		sock.data.userId = id
		let person = new Member(id, !USERS.users[id] ? USERS.users.default : USERS.users[id] , sock.id)

		var room, roomId

		//add to existing room
		if (!!fillingRoomId && rooms.get(fillingRoomId).members.length < roomSize) {
			roomId = fillingRoomId
			room = rooms.get(fillingRoomId)
		}
		else {	//create new room
			roomId = (new Date()).getTime()
			room = new Room (roomId)
			fillingRoomId = roomId
		}

		room.members = [...room.members, id]

		sock.join(roomId)
		sock.emit("status", "filling")
		person.roomId = roomId

		//start when room full
		if (room.members.length >= roomSize){
			fillingRoomId = undefined;
			room.status = "ready"	//WARNING tmp

			setTimeout( () => {
				io.to(roomId).emit("status","ready")	//WARNING tmp
			},2000)
		}

		persons.set(id, person)
		rooms.set(roomId, room)

		const members = room.members.map(userId => persons.get(userId)).map(({id, name, icon, birth, city, university, team}) => ({name, icon, birth, city, university, id, team}))

		io.to(roomId).emit("members", members)

	})


	sock.on("locUpdate", geolocation => {

		var person = persons.get(sock.data.userId)
		person.geolocation = geolocation
		persons.set(sock.data.userId, person)


		if (!updateLocationsTimeout)
			updateLocationsTimeout = setTimeout(()=>{

				const locations = rooms.get(person.roomId).members.map(userId => persons.get(userId).geolocation)

				//TODO calculate distance
				const distance = 0;	//WARNING tmp to skip searching phase

				io.to(person.roomId).emit("locUpdate", distance, locations)

			}, 1000)

	})

	sock.on("rotate", isHorizontal => {

		var person = persons.get(sock.data.userId)

		var room = rooms.get(person.roomId)
		room.ready = isHorizontal ? room.ready+1 : room.ready-1;
		rooms.set(person.roomId, room)

		if (room.ready >= roomSize){
			room.status = 'ready'
			rooms.set(person.roomId, room)
			io.to(room.id).emit("status", "ready")


			//assign questions & items

			var rooms_object = DATA.rooms
			var objects		 = DATA.objects
			var items		 = DATA.items
			var questions	 = DATA.questions

			room.members.forEach((userId, idx) => {

				var person = persons.get(userId)


				/*
				person.objects = getRandom(objects, 5)
				objects = objects.filter(item => !person.objects.includes(item));

				person.items = getRandom(items, 5)
				items = items.filter(item => !person.items.includes(item));
				*/

				person.wall = '/walls/'+wallImages[idx]
				person.objects = objects
				.filter( (obj,IDX) => rooms_object[idx].includes(IDX) )
				.map( ({question, item, ...left}) => {

					console.log(question, questions)

					return ({...left, question:questions[question], item:items[item]})
				} )

				persons.set(userId,  person)

				io.to(person.socketId).emit("questions", {wall : person.wall, objects: person.objects})

			})

			room.status = 'playing'
			rooms.set(room.id, room)

			io.to(room.id).emit("status", "playing")
		}
	})


	sock.on("solved", () => {

		var person = persons.get(sock.data.userId)

		person.solvedKey = true

		const roomId = person.roomId
		var room = rooms.get(roomId)
		room.solvedKeys++


		console.log(room.solvedKeys)
		if (room.solvedKeys >= roomSize){
			room.status = "ended"
			io.to(roomId).emit("status", "ended")
		}

		//rooms.set(roomId, room)
	})

	sock.onAny((evento, arg1) => console.log(evento, arg1))

	/*
	sock.on('disconnect', () => {

		const person = persons.get(sock.data.userId)
		persons.del(sock.data.userId)
		var room = rooms.get(person.roomId)
		room.members = room.members.filter(userId => userId !== person.id)
		rooms.set(person.roomId, room)

	})
*/
})

server.listen(process.env.port, ()=>console.log("server listening"))


