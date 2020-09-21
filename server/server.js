//import Socket.IO library
let socketIO = require('socket.io');
const { v4: uuidv4 } = require('uuid');

//Server class to represent the server
module.exports = class Server {
    constructor() {
        this.activeSockets = {};//stores active connections
        this.activeSocketsIndex = {};//stores uuid index of connections
    }

    listen(PORT) {
        this.PORT = PORT;//port to listen to
        this.io = socketIO.listen(this.PORT);//listen to the port
        console.log("Listening to ", this.PORT)
        this.handleSocketConnection();//handle new connections on the port
    }

    handleSocketConnection() {
        this.io.on("connection", socket => {
            console.log('Client connected.');
            //check if connection exists
            const existingSocket = this.activeSockets[socket.id];

            if (!existingSocket) {
                //apply uuid to user
                const id = uuidv4();
                this.activeSockets[socket.id] = id;
                this.activeSocketsIndex[id] = socket.id;
                //set user id
                socket.emit("set-id", {
                    code: id
                });
            }
            //prepare to call a user
            socket.on("call-user", (data) => {
                if (this.activeSocketsIndex[data.to]) {
                    socket.to(this.activeSocketsIndex[data.to]).emit("call-made", {
                        offer: data.offer,
                        socket: socket.id
                    });
                } else {
                    socket.emit('call-invalid', { id: data.to })
                }
            });
            //prepare to answer call
            socket.on("call-answer", data => {
                socket.to(data.to).emit("call-answered", {
                    socket: socket.id,
                    answer: data.answer
                });
            });
            //prepare to reject call
            socket.on("call-reject", data => {
                socket.to(data.from).emit("call-rejected", {
                    socket: socket.id
                });
            });
            //on client disconnect, remove user
            socket.on("disconnect", () => {
                let id = this.activeSockets[socket.id];
                delete this.activeSocketsIndex[id];
                delete this.activeSockets[socket.id];
            });
        });
    }
}