// Authentication handler
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});
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
    return key === 'adminsecretkey';
}

exports['default'] = authenticate;
module.exports = exports['default'];
