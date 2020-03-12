require('dotenv').config();

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: "vpress-def8f.firebaseapp.com",
  databaseURL: "https://vpress-def8f.firebaseio.com",
  projectId: "vpress-def8f",
  storageBucket: "vpress-def8f.appspot.com",
  messagingSenderId: "194948384137",
  appId: process.env.FIREBASE_APP_ID
};

export default firebaseConfig;