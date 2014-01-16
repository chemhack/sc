var chatApp = angular.module('chatApp', []);
var socket = io.connect();

var roomId='12345';

chatApp.controller('ChatCtrl', function ($scope) {
    $scope.logs=[];
    socket.emit('subscribe',{room:roomId});
    $scope.sendMessage=function(){
        if($scope.messageLine){
            var messageLog={
                from:'Me',
                message:$scope.messageLine,
                status:'sending'
            };
            $scope.logs.push(messageLog);
            socket.emit('message',{room:roomId,message:$scope.messageLine},function(data){
                $scope.$apply(function(){
                    messageLog.status='sent';
                });
            });
            $scope.messageLine='';
            setTimeout(function(){
                var $list= $("#chat-area");
                $list.scrollTop($list[0].scrollHeight);
            }, 0);
        }
    };
    socket.on('message', function (data) {
        var messageLog={
            from:'The other one',
            message:data.message,
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
