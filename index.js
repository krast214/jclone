const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

// In-memory storage for game rooms
const gameRooms = {};
const MAX_PLAYERS_PER_ROOM = 8;

// Handle incoming socket connections
io.on('connection', (socket) => {
  console.log('A user connected');

  // Join a game room
  socket.on('joinRoom', (roomCode) => {
    if (gameRooms[roomCode] && gameRooms[roomCode].players.length >= MAX_PLAYERS_PER_ROOM) {
      socket.emit('roomFull');
      return;
    }

    socket.join(roomCode);
    console.log(`User joined room ${roomCode}`);

    // Initialize the room if it doesn't exist
    if (!gameRooms[roomCode]) {
      gameRooms[roomCode] = {
        players: [],
        host: socket.id,
      };
    }

    // Add the player to the room
    gameRooms[roomCode].players.push(socket.id);

    // Notify other players in the room
    io.to(roomCode).emit('playerJoined', gameRooms[roomCode].players.length);

    // Notify the joining player
    socket.emit('roomJoined', roomCode, gameRooms[roomCode].players.length);
  });

  // Host a new game room
  socket.on('hostRoom', () => {
    const roomCode = generateRoomCode(); // Implement your room code generation logic
    socket.join(roomCode);
    console.log(`User hosted room ${roomCode}`);

    gameRooms[roomCode] = {
      players: [socket.id],
      host: socket.id,
    };

    socket.emit('roomHosted', roomCode, 1);
  });

  // Handle disconnections
  socket.on('disconnect', () => {
    console.log('A user disconnected');

    // Remove the player from any rooms they were part of
    Object.keys(gameRooms).forEach((roomCode) => {
      const room = gameRooms[roomCode];
      const playerIndex = room.players.indexOf(socket.id);

      if (playerIndex !== -1) {
        room.players.splice(playerIndex, 1);

        // Notify other players in the room
        io.to(roomCode).emit('playerLeft', room.players.length);

        // If the host disconnected, assign a new host
        if (room.host === socket.id && room.players.length > 0) {
          room.host = room.players[0];
          io.to(roomCode).emit('newHostAssigned', room.host);
        }
      }
    });
  });
});
// Start the server
const PORT = process.env.PORT || 3000;
http.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

function generateRoomCode() {
  // Implement your room code generation logic here
  // For example, you could generate a random 4-digit code
  return Math.floor(1000 + Math.random() * 9000);
}