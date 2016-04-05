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
    return (key === 'adminsecretkey');
}

export default authenticate;
