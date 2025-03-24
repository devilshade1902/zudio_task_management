import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyB683Wj7sEH2qUMzvl_ExCZIroeY6GEN-0",
    authDomain: "task-manager-21918.firebaseapp.com",
    projectId: "task-manager-21918",
    storageBucket: "task-manager-21918.firebasestorage.app",
    messagingSenderId: "436159156354",
    appId: "1:436159156354:web:dbaf6a65a05a04c3a3649b",
    measurementId: "G-M8L2B1XK66"
  };

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

export { auth, provider, signInWithPopup };
