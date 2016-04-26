/*
 * Copyright 2007-2016 Charles du Jeu <charles (at) pydio.com>
 * This file is part of Pydio.
 *
 * Pydio is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Pydio is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with Pydio.  If not, see <http://www.gnu.org/licenses/>.
 *
 * The latest code can be found at <http://pydio.com/>.
 */

import "babel-polyfill";

// Setting process title
process.title = "pydio-websocket-server";

// Main requires
var http = require("http");
var express = require("express");
var cookieParser = require('socket.io-cookie-parser');

// Server requires
var ServerEndpoint = require('./lib/ServerEndpoint');
var serverAuthenticator = require('./lib/ServerAuthenticator');

// Client requires
var ClientEndpoint = require('./lib/ClientEndpoint');
var clientAuthenticator = require('./lib/ClientAuthenticator');

// Starting app
var app = express();
app.use(express.static(__dirname + "/"));

// Retrieving config
var publicPort = process.env["npm_config_public_port"] || process.env["npm_package_configs_public_port"] || 5000;
var privatePort = process.env["npm_config_private_port"] || process.env["npm_package_configs_private_port"] || 5000;
var publicNS = process.env["npm_config_public_path"] || process.env["npm_package_configs_public_path"] || "/public";
var privateNS = process.env["npm_config_private_path"] || process.env["npm_package_configs_private_path"] || "/private";
var publicSocket;
var privateSocket;
var publicIO;
var privateIO;

// Initialising ports
if (publicPort == privatePort) {
    var socket = publicSocket = privateSocket = http.createServer(app);
    var port = publicPort = privatePort;

    // Listening to ports
    socket.listen(port);

    var io = publicIO = privateIO = require('socket.io')(socket);

    console.log('Server listening to port ' + port + ' for public and private connections');
} else {
    publicSocket = http.createServer(app);
    privateSocket = http.createServer(app);

    // Listening to ports
    publicSocket.listen(publicPort);
    privateSocket.listen(privatePort);

    publicIO = require('socket.io')(publicSocket);
    privateIO = require('socket.io')(privateSocket);

    console.log('Server listening to port ' + publicPort + ' for public connections');
    console.log('Server listening to port ' + privatePort + ' for private connections');
}

// Initialising client
publicIO
    .of(publicNS)
    .use(cookieParser())
    .use(clientAuthenticator)
    .on('connection', function (socket) {
        console.log('Created Public Socket connection');
        new ClientEndpoint(socket);
    })

// Initialising servers
privateIO
    .of(privateNS)
    .use(serverAuthenticator)
    .on('connection', function (socket) {
        console.log('Created Private Socket connection');
        new ServerEndpoint(socket, publicIO.of(publicNS));
    })
