
import express from 'express'
import path from 'path'
import http from 'http'
import { Server, Socket } from 'socket.io'

const port: number = 3000

class App {
    private server: http.Server
    private port: number

    private io: Server
    private clients: any = {}

    constructor(port: number) {
        this.port = port
        const app = express()
        app.use(express.static(path.join(__dirname, '../client')))

        this.server = new http.Server(app)

        this.io = new Server(this.server)
        // update on user connect
        this.io.on('connection', (socket: Socket) => {
            console.log(socket.constructor.name)
            this.clients[socket.id] = {}
            console.log(this.clients)
            console.log('a user connected : ' + socket.id)
            socket.emit('id', socket.id)
            console.log("User data on conection", this.clients)
            // update on user disconnect
            socket.on('disconnect', () => {
                console.log('socket disconnected : ' + socket.id)
                if (this.clients && this.clients[socket.id]) {
                    console.log('deleting ' + socket.id)
                    delete this.clients[socket.id]
                    this.io.emit('removeClient', socket.id)
                }
            })
            // Getting user data
            socket.on('update', (message: any) => {
                if (this.clients[socket.id]) {
                    this.clients[socket.id].myName = message.n // User name
                    this.clients[socket.id].t = message.t //Time
                    this.clients[socket.id].p = message.p //positio
                    this.clients[socket.id].r = message.r //rotation
                }
            })

            //Gettting message from user
            socket.on('newMessageToServer', (dataDromClient) =>
            {
                console.log("Data", dataDromClient);
                console.log("User data givin message", this.clients[socket.id].myName)
                this.io.emit("newMessageToClients", {text: dataDromClient.text, clientName: this.clients[socket.id].myName, timestamp:this.clients[socket.id].t})
            })
        })

        setInterval(() => {
            this.io.emit('clients', this.clients)
        }, 50)
    }

    public Start() {
        this.server.listen(this.port, () => {
            console.log(`Server listening on port ${this.port}.`)
        })
    }
}

new App(port).Start()