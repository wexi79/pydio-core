class ServerEndpoint {

    constructor(socket, clients) {
        this.socket = socket;
        this.clients = clients;

        this.socket.on('message', this.receive.bind(this));
    }

    // Message received handler
    receive(data) {
        var obj = JSON.parse(data.message);

        this.dispatch(this.clients, obj);
    }

    // Dispatching messages to clients
    dispatch(clients, message) {
        var room = '';

        if (typeof message.USER_ID !== 'undefined') {
            room = 'user ' + message.USER_ID
        } else if (typeof message.GROUP_PATH !== 'undefined') {
            room = 'group ' + message.GROUP_PATH
        } else if (typeof message.REPO_ID !== 'undefined') {
            room = 'repository ' + message.REPO_ID
        }

        console.log('Dispatching to ', room);

        if (room !== '') {
            clients
                .to(room)
                .emit('message', message.CONTENT)
        }
    }

}

export default ServerEndpoint;
