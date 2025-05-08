import io from 'socket.io-client';

const socket = io('http://localhost:5001', {
  withCredentials: true,
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 2000,
  timeout: 20000,
  forceNew: false,
});

export default socket;