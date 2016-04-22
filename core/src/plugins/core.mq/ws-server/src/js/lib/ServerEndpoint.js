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

class ServerEndpoint {

    constructor(socket, clients) {
        this.socket = socket;
        this.clients = clients;

        this.socket.on('message', this.receive.bind(this));
    }

    // Message received handler
    receive(data) {
        var obj = JSON.parse(data.message);

        this.dispatch(this.clients, obj);
    }

    // Dispatching messages to clients
    dispatch(clients, message) {
        var room = '';

        if (typeof message.USER_ID !== 'undefined') {
            room = 'user ' + message.USER_ID
        } else if (typeof message.GROUP_PATH !== 'undefined') {
            room = 'group ' + message.GROUP_PATH
        } else if (typeof message.REPO_ID !== 'undefined') {
            room = 'repository ' + message.REPO_ID
        }

        console.log('Dispatching ' , message.length, 'bytes to ', room);

        if (room !== '') {
            clients
                .to(room)
                .emit('message', message.CONTENT)
        }
    }
}

export default ServerEndpoint;
