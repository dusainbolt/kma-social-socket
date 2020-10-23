"use strict";
const express = require("express");
const socketIO = require("socket.io");

const PORT = process.env.PORT || 3000;
const INDEX = "/index.html";

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
  RECEIVE_TYPING_CHAT: "__sendTypingChat",
  SEND_TYPING_CHAT: "__typingChatRoom:id=",
  ROOM_CHAT: "__roomChat:id=",
  MY_INBOX: "__myInbox:id=",
  OPEN_MY_BOX_CHAT: "__openBoxChat",
  RECEIVE_BOX_CHAT: "__receiveBoxChat:id=",
  ON_READ_ROOM: "__onReadRoom",
  RECEIVE_READ_ROOM: "__receiveReadRoom:id=",
};

io.on("connection", socket => {
  clients[socket.id] = socket;

  console.log("----------------->Client connected " + socket.id);

  socket.on(CHANNEL.SPEAK_USER_ID, userId => {
    console.log("----------------->userOnline: " + userId);
    userOnline[socket.id] = userId;
    console.log("----------------->sendListOnline: " + userOnline);
    io.emit(CHANNEL.LIST_ONLINE, userOnline);
  });

  socket.on(CHANNEL.RECEIVE_TYPING_CHAT, roomChat => {
    console.log("----------------->roomTypingChat: " + roomChat.idRoomChat);
    io.emit(`${CHANNEL.SEND_TYPING_CHAT}${roomChat.idRoomChat}`, roomChat);
  });

  socket.on(CHANNEL.OPEN_MY_BOX_CHAT, (userInbox, userId) => {
    console.log("----------------->openBoxChat: " + userInbox, userId);
    io.emit(`${CHANNEL.RECEIVE_BOX_CHAT}${userId}`, userInbox);
  });

  socket.on(CHANNEL.ON_READ_ROOM, (userId, roomId) => {
    console.log("----------------->onReadRoom: ", roomId);
    io.emit(`__receiveReadRoom:id=${roomId}`, userId);
  });

  ////////AUTH SOCKET
  socket.on(CHANNEL.LOG_OUT, socketId => {
    console.log("----------------->logoutSocket: " + socketId);
    removeSocket(socketId);
    io.emit(CHANNEL.LIST_ONLINE, userOnline);
  });

  socket.on("disconnect", reason => {
    console.log("----------------_DISCONNECT", reason);
    removeSocket(socket.id);
    io.emit(CHANNEL.LIST_ONLINE, userOnline);
  });
  baseSocket(socket);
});

function removeSocket(socketId) {
  delete clients[socketId];
  delete userOnline[socketId];
}

var Redis = require("ioredis");
var redis = new Redis(
  "redis://h:paa9428c6abacdb375edd4d34a5659b67bc59ceba0466c6c3bf442e54a21dfad3@ec2-50-19-39-23.compute-1.amazonaws.com:13509"
);
// var redis = new Redis(8099);

redis.psubscribe("*", function (error, count) {
  console.log("Subscribe redis success!!!");
});

redis.on("pmessage", function (parther, channel, message) {
  const objectData = JSON.parse(message);
  const { payload, chanelName } = objectData.data;
  // get channel api backend
  console.log("--------------->Channel: ", chanelName);
  console.log("--------------->Message", message);
  io.emit(`${chanelName}`, payload);
  handleChannelRedis(chanelName, payload);
  console.log("------>>>>>>>>>>>>>>SEND SOCKET SUCCESS<<<<<<<<<<<<<<---------");
});

function handleChannelRedis(channel, payload) {
  if (channel.indexOf(CHANNEL.ROOM_CHAT) !== -1) {
    io.emit(`${CHANNEL.MY_INBOX}${payload.data.idUserInbox}`, payload.data);
    console.log("-------------> HANDLE REDIS-> userInbox", payload.data);
  }
}

function baseSocket(socket) {
  socket.on("reconnect", attemptNumber => {
    console.log("----------------reconnect", attemptNumber);
    // ...
  });
  socket.on("reconnecting", attemptNumber => {
    console.log("----------------reconnecting", attemptNumber);
  });
  socket.on("reconnect_error", error => {
    console.log("----------------reconnect_error", error);
  });
  socket.on("reconnect_failed", () => {
    console.log("----------------reconnect_fail");
  });
  socket.on("connect_error", error => {
    console.log("----------------connect_error", error);
  });
  socket.on("connect_timeout", timeout => {
    console.log("----------------time_out", timeout);
  });
  socket.on("error", error => {
    console.log("----------------error", error);
  });
}
