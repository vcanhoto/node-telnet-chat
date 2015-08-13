var events = require('events');
var net = require('net');

var channel = new events.EventEmitter();
channel.clients = {};
channel.subscriptions = {};
channel.setMaxListeners(50);

// Add a listener for the join event that stores a user's client object,
// allowing the application to send data back to the user
channel.on('join', function(id, client){
    console.log('User ' + id + ' joined');

    var welcome = "Welcome!\nGuests online: " + this.listeners('broadcast').length;
    client.write(welcome);

    this.clients[id] = client;
    this.subscriptions[id] = function(senderId, message){
        // Ignore data if it's been broadcast by the user
        if(id != senderId) {
            console.log('Send message to ' + id);
            this.clients[id].write(message);
        }
    };

    // Add a listener, specific to the current user, for the broadcast event
    this.on('broadcast', this.subscriptions[id]);
});

channel.on('leave', function(id){
    channel.removeListener('broadcast', this.subscriptions[id]);
    channel.emit('broadcast', id, id + " has left the chat.");
});

channel.on('shutdown', function() {
    channel.emit('broadcast', '', "Chat has shut down. See you later.");
    channel.removeAllListeners('broadcast');
});

var server = net.createServer(function(client){
    var id = client.remoteAddress + ':' + client.remotePort;

    channel.emit('join', id, client);

    client.on('data', function(data){
        data = data.toString();
        if (data == "/shutdown") {
            channel.emit('shutdown');
        }
        // Emit a channel broadcast event, specifying the user ID and
        // message, when any user sends data
        console.log('Emit broadcast');
        channel.emit('broadcast', id, data);
    });

    client.on('close', function() {
        channel.emit('leave', id);
    });
});

server.listen(8888);