//server.js
import http from "http";
import SocketIO from "socket.io";
import express from "express";

const app = express();

app.set("view engine", "pug");
app.set("views", __dirname + "/views");
app.use("/public", express.static(__dirname+"/public"));
app.get("/", (req,res) => res.render("home"));
app.get("/*", (req,res) => res.redirect("/"));

const httpServer = http.createServer(app); //http server
const wsServer = SocketIO(httpServer); //webSocket 작동

function publicRooms(){
    const {sockets : {adapter: {sids, rooms}}} = wsServer;
    //=const sids = wsServer.sockets.adapter.sids;
    //=const rooms = wsServer.sockets.adapter.rooms;
    //wsServer.sockets.adapter로부터 sids와 rooms을 가져옴
    const publicRooms =[];
    rooms.forEach((_, key) => { //value는 신경쓰지 않기 때문에 _로 취급
        if(sids.get(key) === undefined) {
            publicRooms.push(key);
        }
    }); //원하는 publicRooms를 push함
    return publicRooms;
}//public rooms을 주는 function

function countRoom(roomName){
    return wsServer.sockets.adapter.rooms.get(roomName)?.size;
} //한 방에 몇명이 있는지 계산

wsServer.on("connection", (socket) => {
    socket["nickname"] = "Anon";
    socket.onAny((event) => {console.log(`Socket Event: ${event}`);
    })
    socket.on("enter_room", (roomName, done) => {
        socket.join(roomName); 
        done();
        socket.to(roomName).emit("welcome", socket.nickname, countRoom(roomName)); //메세지를 하나의 socket에만 보냄
        wsServer.sockets.emit("room_change", publicRooms()); //메세지를 모든 socket에 보냄

    });
    socket.on("disconnect", () => {
        wsServer.sockets.emit("room_change", publicRooms());
    });
    socket.on("disconnecting", () => {
        socket.rooms.forEach((room) => socket.to(room).emit("bye", socket.nickname, countRoom(roomName)-1));
    });
    socket.on("new_message",(msg, room, done) => {
        socket.to(room).emit("new_message", `${socket.nickname}: ${msg}`);
        done(); //done 코드는 백엔드에서 실행 X 호출 시 프론트엔드에서 실행
        //기본적으로 백엔드에서 코드를 시작할 수 있게 해줌
    })
    socket.on("nickname", (nickname) => (socket["nickname"] = nickname));
    //nickname event가 발생하면 nickname을 가져와서 socket에 저장
});


const handleListen = () => console.log(`Listening on http://localhost:3000`);
httpServer.listen(3000, handleListen);
