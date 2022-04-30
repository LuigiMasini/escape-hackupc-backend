

function Member(member) {
	this.id = member
	this.status		//online, lost, quit
	this.geolocation
}

function Room (id) {
	this.id=id
	this.members=[]

	this.addMember = (memberId) => {
		this.members.push(memberId)
	}

	this.status		//filling, searching, ready, playing, ended


	//parte di gioco

}


export {Member, Room}
