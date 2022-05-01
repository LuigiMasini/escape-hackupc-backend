import fs from 'fs'

const wallImages = ['wall0.jpg', 'wall1.jpg', 'wall2.jpg', 'wall3.jpg']

function Member(userId, user, socketId) {

	this.id = userId
	this.name = user.name
	this.birth = user.birth
	this.city = user.city
	this.university = user.university
	this.icon = '/propics/'+( Math.floor(Math.random() * 19 ) ) + '.jpg'
	this.ready = false

	this.geolocation
	this.socketId = socketId
	this.roomId

	this.wall = ''
	this.objects

	this.solvedKey = false	//bool
}

function Room (id) {
	this.id=id
	this.members=[]
	this.ready = 0

	this.status = "filling"		//filling, searching, ready, playing, ended

	this.solvedKeys = 0
}


export {Member, Room, wallImages}
