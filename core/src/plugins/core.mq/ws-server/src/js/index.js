// Main requires
var http = require("http")
var express = require("express")
var cookieParser = require('socket.io-cookie-parser')

// Server requires
var ServerEndpoint = require('./lib/ServerEndpoint')
var serverAuthenticator = require('./lib/ServerAuthenticator')

// Client requires
var ClientEndpoint = require('./lib/ClientEndpoint')
var clientAuthenticator = require('./lib/ClientAuthenticator')

// Starting app
var app = express()
app.use(express.static(__dirname + "/"))

// Retrieving config
var portForClients = process.env.PORT_CLIENT || 5000
var portForServers = process.env.PORT_SERVER || 5000
var socketClients
var socketServers
var ioClients
var ioServers

// Initialising ports
if (portForClients == portForServers) {
    var socket = socketClients = socketServers = http.createServer(app)
    var port = portForClients = portForServers

    // Listening to ports
    socket.listen(port)

    var io = ioClients = ioServers = require('socket.io')(socket)
} else {
    socketClients = http.createServer(app)
    socketServers = http.createServer(app)

    // Listening to ports
    socketClients.listen(portForClients)
    socketServers.listen(portForServers)

    ioClients = require('socket.io')(socketClients)
    ioServers = require('socket.io')(socketServers);
}

// Initialising client
ioClients
    .of('/public')
    .use(cookieParser())
    .use(clientAuthenticator)
    .on('connection', function (socket) {
        new ClientEndpoint(socket);
    })

// Initialising servers
ioServers
    .of('/private')
    .use(serverAuthenticator)
    .on('connection', function (socket) {
        new ServerEndpoint(socket, ioClients.of('/public'));
    })
