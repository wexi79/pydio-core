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

class ClientEndpoint {

    constructor(socket) {

        var handshake = socket.handshake;

        this.socket = socket;
        this.userId = handshake.userId;
        this.groupPath = handshake.groupPath;
        this.repositories = handshake.repositories;

        socket.join('user ' + this.userId)
        socket.join('group ' + this.groupPath)

        socket.on('register', this.register.bind(this));

        socket.on('disconnect', this.disconnect.bind(this));
    }

    register(data, opts) {
        var repositoryId = data && data.my;

        if (repositoryId && this.repositories.indexOf(repositoryId) > -1) {
            console.log('Joining room : repository ' + repositoryId)
            this.socket.join('repository ' + repositoryId);
        } else {
            console.log('Not allowed in room - ', repositoryId);
        }
    }

    disconnect() {
        console.log('Client socket disconnected');
    }

}

export default ClientEndpoint;
