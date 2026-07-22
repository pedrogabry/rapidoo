import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from "firebase/database";
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyCn6xyxuUiiIr_NyhE9aZ9hRMC-MAeYYq4",
  authDomain: "rapidoo-802c5.firebaseapp.com",
  projectId: "rapidoo-802c5",
  storageBucket: "rapidoo-802c5.firebasestorage.app",
  messagingSenderId: "689207452460",
  appId: "1:689207452460:web:19996b463d0961fcf5c289",
  measurementId: "G-B9H98XRTVP",
  databaseURL: "https://rapidoo-802c5-default-rtdb.firebaseio.com",

};

const app = initializeApp(firebaseConfig);

export const database = getDatabase(app);
export const db = getFirestore(app);
export const auth = getAuth(app);