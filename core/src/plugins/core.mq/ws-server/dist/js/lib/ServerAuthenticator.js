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
var crypto = require('crypto');

// Authentication handler
function authenticate(socket, next) {
    var handshakeData = socket.request;

    if (check(handshakeData.headers['admin-key'])) {
        // Server is authenticated
        next();
    } else {
        console.error('Wrong secret key given');
    }
}

// Checking authentication key
function check(key) {
    var md5 = crypto.createHmac("md5", "Pydi0W3bS0ck3!").update(key).digest("hex");

    return md5.length > 0 && md5 === process.env["npm_config_key"];
}

exports['default'] = authenticate;
module.exports = exports['default'];
