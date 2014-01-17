var chatApp = angular.module('chatApp', []);
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


var roomId=window.location.pathname;

generateMyKeyPair();

chatApp.controller('ChatCtrl', function ($scope) {
    $scope.logs=[];
    socket.emit('subscribe',{room:roomId},function(data){
        if(data.status=='ok'){
            $scope.status="subscribed";
            $scope.$digest();
        }
    });
    $scope.sendMessage=function(){
        if($scope.messageLine){
            var messageLog={
                from:'Me',
                message:$scope.messageLine,
                status:'sending'
            };
            $scope.logs.push(messageLog);

            var messageObj={message:sjcl.encrypt(keys.sharedKey, ($scope.messageLine))};
            console.log(messageObj);
            socket.emit('message',messageObj,function(data){
                messageLog.status='sent';
                $scope.$digest();
            });
            $scope.messageLine='';
            setTimeout(function(){
                var $list= $("#chat-area");
                $list.scrollTop($list[0].scrollHeight);
            }, 0);
        }
    };
    
    socket.on('partner connected',function(){
        $scope.status="partner connected";
        $scope.$digest();
        socket.emit('public key',keys.myPublicKeyHex);
    });
    
    socket.on('public key',function(data){
        $scope.status="partner key got, from " +data.from;
        $scope.$digest();
        calculateSharedKey(data.data);
        $scope.status="key calculated, from " +data.from+", key "+keys.sharedKey;
        $scope.$digest();
        keys.cipher=new sjcl.cipher.aes(keys.sharedKey);
        // socket.emit('public key',keys.myPublicKeyHex);
    });

    socket.on('message', function (data) {
        var messageLog={
            from:'The other one',
            message:sjcl.decrypt(keys.sharedKey,data.data.message),
            status:'Recv'
        };
        $scope.logs.push(messageLog);
        $scope.$digest();
        setTimeout(function(){
            var $list= $("#chat-area");
            $list.scrollTop($list[0].scrollHeight);
        }, 0);
    });
});
