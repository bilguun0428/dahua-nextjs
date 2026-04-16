import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDRyXQqpvF9L9D56a100Dk5J23WEGZW3eQ",
  authDomain: "dahua-price.firebaseapp.com",
  databaseURL: "https://dahua-price-default-rtdb.firebaseio.com",
  projectId: "dahua-price",
  storageBucket: "dahua-price.firebasestorage.app",
  messagingSenderId: "542938400540",
  appId: "1:542938400540:web:529c931d488cb94ee6dcd9",
  measurementId: "G-XKSYYQFB8W",
};

// Initialize Firebase (prevent duplicate init in dev with hot reload)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const db = getFirestore(app);
export const rtdb = getDatabase(app);
export const auth = getAuth(app);
export default app;
