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
    var query,
        headers,
        url,
        jar,
        cookie,
        auth_private,
        auth_hash,
        auth_token,
        queryToken = '',
        forwardedHeaders = {};

    // Retrieving data
    query = socket.request._query;
    headers = socket.request.headers;

    url = headers.origin;

    // Initing the cookie jar
    jar = request.jar();
    cookie = request.cookie('AjaXplorer=' + socket.request.cookies.AjaXplorer);
    jar.setCookie(cookie, headers.origin);

    auth_token = headers["pydio_auth_token"] || query.auth_token;
    auth_hash = headers["pydio_auth_hash"] || query.auth_hash;

    if (query.token) {
        queryToken = '&secure_token=' + query.token;
    } else if (auth_hash && auth_token) {
        queryToken = '&auth_token=' + auth_token + '&auth_hash=' + auth_hash;
    } else {
        console.error('No authentication token');
        return;
    }

    // Sending authentication request
    request.post({
        url: headers.origin + 'pydio/ws_authenticate' + queryToken,
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

    var allowedRooms = {
        userId: userId,
        groupPath: groupPath,
        repositories: repositories
    };

    console.log('Client allowed in following rooms ', allowedRooms);

    return allowedRooms;
}

function check(err, httpResponse, body) {
    return !err && httpResponse.statusCode === 200;
}

exports['default'] = authenticate;
module.exports = exports['default'];
