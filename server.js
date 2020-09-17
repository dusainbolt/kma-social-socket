'use strict';
const express = require('express');
const socketIO = require('socket.io');

const PORT = process.env.PORT || 3000;
const INDEX = '/index.html';

const server = express()
  .use((req, res) => res.sendFile(INDEX, { root: __dirname }))
  .listen(PORT, () => console.log(`Listening on ${PORT}`));

const io = socketIO(server);

let clients = {};
let userOnline = {};

const CHANNEL = {
  LOG_OUT: "__logout",
  SPEAK_USER_ID: "__speakerUserId",
  LIST_ONLINE: "__listOnline",
};

io.on('connection', (socket) => {
  clients[socket.id] = socket;
  console.log('----------------->Client connected ' + socket.id);

  socket.on(CHANNEL.SPEAK_USER_ID, (userId)=> {
    console.log('----------------->userOnline: ' + userId);
    userOnline[socket.id] = userId;
    console.log('----------------->sendListOnline: ' + userId);
    io.emit(CHANNEL.LIST_ONLINE, userOnline);
  });

  socket.on(CHANNEL.LOG_OUT, (socketId)=> {
    console.log('----------------->logoutSocket: ' + socketId);
    removeSocket(socketId);
    io.emit(CHANNEL.LIST_ONLINE, userOnline);
  });

  socket.on('disconnect', () =>{
    console.log('----------------->DISCONNECT--------------------<');
    removeSocket(socket.id);
    io.emit(CHANNEL.LIST_ONLINE, userOnline);
  })
});

function removeSocket(socketId){
  delete clients[socketId];
  delete userOnline[socketId];
}

var Redis = require('ioredis');
var redis = new Redis("redis://h:paa9428c6abacdb375edd4d34a5659b67bc59ceba0466c6c3bf442e54a21dfad3@ec2-52-2-204-37.compute-1.amazonaws.com:27239");
// var redis = new Redis(8099);

redis.psubscribe("*", function(error, count){
  console.log("Subscribe redis success!!!");
});

redis.on("pmessage", function(parther, channel, message){
  const objectData = JSON.parse(message);
  const { payload, chanelName } = objectData.data;
  // get channel api backend
  console.log("--------------->Channel: ", chanelName);
  console.log("--------------->Message",  message);
  io.emit(`_${chanelName}`, payload);
  console.log("------>>>>>>>>>>>>>>SEND SOCKET SUCCESS<<<<<<<<<<<<<<---------");
});