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
    }

    register(data, opts) {
        var repositoryId = data.my;

        if (this.repositories.indexOf(repositoryId) > -1) {
            this.socket.join('repository ' + repositoryId);
        }
    }

}

export default ClientEndpoint;
