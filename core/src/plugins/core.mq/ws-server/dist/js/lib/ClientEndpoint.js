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
