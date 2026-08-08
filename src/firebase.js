import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDisTH9oBNYBqyM66pjm1BW7OuNYEhU9Us",
  authDomain: "univote-40f02.firebaseapp.com",
  projectId: "univote-40f02",
  storageBucket: "univote-40f02.firebasestorage.app",
  messagingSenderId: "373952302832",
  appId: "1:373952302832:web:66604d2954d7ece8533c35"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

// Initialize Firebase Storage and get a reference to the service
export const storage = getStorage(app);

export default app;
