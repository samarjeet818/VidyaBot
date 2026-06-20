import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA-WDh2H--oZRlB5y4L0KhUFssmZYRn7jo",
  authDomain: "vidy-bot.firebaseapp.com",
  projectId: "vidy-bot",
  storageBucket: "vidy-bot.firebasestorage.app",
  messagingSenderId: "742299404186",
  appId: "1:742299404186:web:bc8a521c9850e0983b9c23"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);
