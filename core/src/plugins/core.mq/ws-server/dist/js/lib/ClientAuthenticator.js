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
var request = require('request');
var xpath = require('xpath');
var DOMParser = require('xmldom').DOMParser;

function authenticate(socket, next) {

    var query, headers, jar, cookie;

    // Retrieving data
    query = socket.request._query;
    headers = socket.request.headers;

    // Initing the cookie jar
    jar = request.jar();
    cookie = request.cookie('AjaXplorer=' + socket.request.cookies.AjaXplorer);
    jar.setCookie(cookie, headers.origin);

    // Sending authentication request
    request.get({
        url: headers.origin + '?get_action=ws_authenticate&secure_token=' + query.token,
        jar: jar
    }, (function (err, httpResponse, body) {

        if (check(err, httpResponse)) {
            Object.assign(socket.handshake, loadInfo(new DOMParser().parseFromString(body, "text/xml")));

            next();
        } else {
            console.error('Failed to authenticate');
        }
    }).bind(this));
}

function loadInfo(xml) {
    var userNode = xpath.select1("/tree/user/@id", xml),
        userId = userNode && userNode.value,
        groupNode = xpath.select1("/tree/user/@groupPath", xml),
        groupPath = groupNode && groupNode.value,
        nodes = xpath.select("/tree/user/repositories/repo", xml),
        repositories = [],
        node,
        attribute,
        i,
        j;

    for (i in nodes) {
        node = nodes[i];
        for (j in node.attributes) {
            attribute = node.attributes[j];
            if (attribute.name == 'id') {
                repositories.push(attribute.nodeValue);
                break;
            }
        }
    }

    return {
        userId: userId,
        groupPath: groupPath,
        repositories: repositories
    };
}

function check(err, httpResponse, body) {
    return !err && httpResponse.statusCode === 200;
}

exports['default'] = authenticate;
module.exports = exports['default'];
