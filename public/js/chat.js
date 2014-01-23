var socket = io.connect();
var keys = {};
var generateMyKeyPair=function(){
    keys.myKeyPair = sjcl.ecc.elGamal.generateKeys(384);
    var publicKey = keys.myKeyPair.pub.get();
    keys.myPublicKeyHex = sjcl.codec.hex.fromBits(publicKey.x) + sjcl.codec.hex.fromBits(publicKey.y);
};

var calculateSharedKey=function(yourKeyHex){
    keys.yourPublicKeyHex=yourKeyHex;
    var yourKeyBits = sjcl.codec.hex.toBits(yourKeyHex);
    keys.yourPublicKey = new sjcl.ecc.elGamal.publicKey(sjcl.ecc.curves.c384, yourKeyBits);
    keys.sharedKey=keys.myKeyPair.sec.dh(keys.yourPublicKey);
};

var chat_list=$('#chat-list');
var message_input=$('#message-input');
var chat_area= $("#chat-area");

var appendMyMessage=function(message,hash){
    chat_list.append('<li class="right clearfix"><span class="chat-img pull-right"><img src="http://placehold.it/50/FA6F57/fff&text=Me" alt="User Avatar" class="img-circle" /></span><div class="chat-body clearfix"><div class="header"><small class=" text-muted"><span class="glyphicon glyphicon-ok"></span><span id="status-'+hash+'">Sending</span></small><strong class="pull-right primary-font">Me</strong></div><p>'
     + message 
     + '</p></li>');
    chat_area.scrollTop(chat_area[0].scrollHeight);
};

var appendYourMessage=function(message,hash){
    chat_list.append('<li class="right clearfix"><span class="chat-img pull-left"><img src="http://placehold.it/50/FA6F57/fff&text=You" alt="User Avatar" class="img-circle" /></span><div class="chat-body clearfix"><div class="header"><strong class="primary-font">Your Partener</strong></div><p>'
     + message 
     + '</p></li>');
    chat_area.scrollTop(chat_area[0].scrollHeight);
};

var appendStatusMessage=function(message){
    chat_list.append('<li>'+message+'</li>');
    chat_area.scrollTop(chat_area[0].scrollHeight);
};

var sendMessage=function(){
    var message=message_input.val();
    if(message){
        var messageLog={
            from:'Me',
            message:message,
            status:'sending'
        };
        var messageObj={message:sjcl.encrypt(keys.sharedKey, message)};
        var msgHash=sjcl.codec.hex.fromBits(sjcl.hash.sha1.hash(JSON.stringify(messageObj)));
        socket.emit('message',messageObj,function(data){
            $('#status-'+msgHash).text('Sent');
        });
        message_input.val('');
        appendMyMessage(message, msgHash);
    }
};


socket.on('partner connected',function(){
    appendStatusMessage("Partner connected, negotiating encryption keys");
    socket.emit('public key',keys.myPublicKeyHex);
});

socket.on('partner disconnected',function(){
    appendStatusMessage("Partner disconnected");
    keys.sharedKey=null;
});

socket.on('public key',function(data){
    calculateSharedKey(data.data);
    appendStatusMessage("keys negotiated, from " +data.from+", key "+sjcl.codec.hex.fromBits(keys.sharedKey));
    keys.cipher=new sjcl.cipher.aes(keys.sharedKey);
});

socket.on('message', function (data) {
    var message=sjcl.decrypt(keys.sharedKey,data.data.message);
    var msgHash=sjcl.codec.hex.fromBits(sjcl.hash.sha1.hash(JSON.stringify(data.data)));
    appendYourMessage(message, msgHash);
    $.titleAlert("New chat message!", {
            requireBlur:true,
            stopOnFocus:true,
            duration:0,
            stopOnMouseMove:true,
            interval:700
    });
    soundManager.play('message');
    socket.emit("delivery",msgHash);
});

socket.on('delivery', function (hash) {
    $('#status-'+hash).text('Delivered');
});


var roomId=window.location.pathname;
generateMyKeyPair();

socket.on('connect',function(){
    appendStatusMessage("Connecting to the server...");
    socket.emit('subscribe',{room:roomId},function(data){
        if(data.status=='ok'){
            appendStatusMessage("Waiting for partner. Send this link: "+window.location.href+". You will be notified when your partner is connected. After that you can chat safely.");
        }
    });
});

soundManager.setup({
    url: '/swf/',

    onready: function() {
        soundManager.createSound({
         id: 'message',
         url: '/message.mp3'
        });
    },

    ontimeout: function() {
      // Uh-oh. No HTML5 support, SWF missing, Flash blocked or other issue
    }

});

$('#message-form').submit(function(event){
    event.preventDefault();
    sendMessage();
});

