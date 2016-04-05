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

            console.log('Dispatching to ', room);

            if (room !== '') {
                clients.to(room).emit('message', message.CONTENT);
            }
        }
    }]);

    return ServerEndpoint;
})();

exports['default'] = ServerEndpoint;
module.exports = exports['default'];
