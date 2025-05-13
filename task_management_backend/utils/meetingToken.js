// server/meetingToken.js
const jwt = require('jsonwebtoken');
const fs = require('fs');
const uuid = require('uuid-random');
require('dotenv').config(); // Load environment variables

// Load environment variables
const privateKeyPath = process.env.PRIVATE_KEY_PATH;
const privateKey = fs.readFileSync(privateKeyPath, 'utf8');
const appId = process.env.JAAS_APP_ID;
const kidId = process.env.KID_ID;

function generateMeetingJWT(roomName, userName) {
  const now = Math.floor(Date.now() / 1000);
  const oneHour = 60 * 60;

  // JWT payload
  const payload = {
    aud: 'jitsi',
    iss: 'chat',
    sub: appId,
    room: roomName,
    exp: now + oneHour,
    nbf: now,
    context: {
      user: {
        id: uuid(), // generate unique user ID
        name: userName,
        email: `${userName.toLowerCase()}@example.com`,
        avatar: 'https://link.to/default/avatar.png',
        moderator: 'true',
      },
      features: {
        livestreaming: 'false',
        outbound_call: 'true',
        transcription: 'false',
        recording: 'false',
        'send-groupchat': 'true',
        'create-polls': 'true',
      },
      room: {
        regex: false,
      },
    },
  };

  // JWT header (includes `kid`)
  const header = {
    alg: 'RS256',
    typ: 'JWT',
    kid: kidId, // Important: `kid` must be in the header
  };

  // Sign and return token
  const token = jwt.sign(payload, privateKey, {
    algorithm: 'RS256',
    header: header,
  });
  return token;
}


module.exports = generateMeetingJWT;
