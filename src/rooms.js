import fs from 'fs'


function Member(userId, user, socketId) {

	this.id = userId
	this.name = user.name
	this.birth = user.birth
	this.city = user.city
	this.university = user.university
	this.icon = '/assets/propic'+( Math.floor(Math.random() * 19 ) ) + '.jpg'
	this.ready = false

	this.geolocation
	this.socketId = socketId
	this.roomId

	this.objects = {}
	this.items = {}
}

function Room (id) {
	this.id=id
	this.members=[]
	this.ready = 0

	this.status = "filling"		//filling, searching, ready, playing, ended

	this.solved = []	//bool
}


export {Member, Room}
