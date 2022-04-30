

function Member(member, socketId) {
	this.id = member
	this.name = ""
	this.icon = ( Math.random() * 19 ) + '.jpg'
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

	this.addMember = (memberId) => {
		this.members.push(memberId)
	}

	this.status = "filling"		//filling, searching, ready, playing, ended

	this.solved = []	//bool
}


export {Member, Room}
