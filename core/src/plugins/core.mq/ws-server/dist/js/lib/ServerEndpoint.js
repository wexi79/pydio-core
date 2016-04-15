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

'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var ServerEndpoint = (function () {
    function ServerEndpoint(socket, clients) {
        _classCallCheck(this, ServerEndpoint);

        this.socket = socket;
        this.clients = clients;

        this.socket.on('message', this.receive.bind(this));
    }

    // Message received handler

    _createClass(ServerEndpoint, [{
        key: 'receive',
        value: function receive(data) {
            var obj = JSON.parse(data.message);

            this.dispatch(this.clients, obj);
        }

        // Dispatching messages to clients
    }, {
        key: 'dispatch',
        value: function dispatch(clients, message) {
            var room = '';

            if (typeof message.USER_ID !== 'undefined') {
                room = 'user ' + message.USER_ID;
            } else if (typeof message.GROUP_PATH !== 'undefined') {
                room = 'group ' + message.GROUP_PATH;
            } else if (typeof message.REPO_ID !== 'undefined') {
                room = 'repository ' + message.REPO_ID;
            }

            console.log('Dispatching ', message.length, 'bytes to ', room);

            if (room !== '') {
                clients.to(room).emit('message', message.CONTENT);
            }
        }
    }]);

    return ServerEndpoint;
})();

exports['default'] = ServerEndpoint;
module.exports = exports['default'];
