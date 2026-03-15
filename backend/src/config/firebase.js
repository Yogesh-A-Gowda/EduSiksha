const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json'); // DOWNLOAD THIS FROM FIREBASE CONSOLE
require('dotenv').config();

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET // e.g., "your-app.appspot.com"
});

const bucket = admin.storage().bucket();

module.exports = { bucket };