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

var ClientEndpoint = (function () {
    function ClientEndpoint(socket) {
        _classCallCheck(this, ClientEndpoint);

        var handshake = socket.handshake;

        this.socket = socket;
        this.userId = handshake.userId;
        this.groupPath = handshake.groupPath;
        this.repositories = handshake.repositories;

        socket.join('user ' + this.userId);
        socket.join('group ' + this.groupPath);

        socket.on('register', this.register.bind(this));
    }

    _createClass(ClientEndpoint, [{
        key: 'register',
        value: function register(data, opts) {
            var repositoryId = data.my;

            if (this.repositories.indexOf(repositoryId) > -1) {
                this.socket.join('repository ' + repositoryId);
            }
        }
    }]);

    return ClientEndpoint;
})();

exports['default'] = ClientEndpoint;
module.exports = exports['default'];
