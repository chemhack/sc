
/**
 * Module dependencies.
 */

var express = require('express');
var routes = require('./routes');
var chat = require('./routes/chat');
var http = require('http');
var path = require('path');

var app = express();
var server = http.createServer(app);
var io = require('socket.io').listen(server);

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(express.cookieParser('cookie_pasword_lol_secure?'));
app.use(express.session());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

app.get('/', routes.index);
app.get('/chat/*', chat.show);


io.sockets.on('connection', function (socket) {
    socket.on('message',function(data,cb){
        socket.broadcast.to(data.room).emit('message', {from:socket.id,data:data});
        cb({'status':'ok'});
    });
    
    socket.on('public key',function(data){
        socket.broadcast.to(data.room).emit('public key', {from:socket.id,data:data});
    });
    
    socket.on('subscribe', function(data,cb) {
        console.log(socket.id+" joining "+data.room)
        var clients=io.sockets.clients(data.room);
        if(clients.length<2){
            socket.set('room', data.room, function () {
                socket.join(data.room);
                socket.emit('joined');
                cb({'status':'ok'});
                if(clients.length==1){
                    io.sockets.in(data.room).emit('partner connected');
                    socket.emit('partner connected');
                }
            });
        }else{
            cb({'status':'failed'});
        }
    });

    socket.on('disconnect', function() { //kick it out
        socket.get('room', function (err,room) {
            socket.leave(room);
            socket.broadcast.to(room).emit('partner left');
        });
    });
});

server.listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});

