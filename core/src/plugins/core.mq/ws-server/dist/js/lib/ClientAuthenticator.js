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
    var userId = xpath.select1("/tree/user/@id", xml).value,
        groupPath = xpath.select1("/tree/user/@groupPath", xml).value,
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
