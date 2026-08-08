import { createContext, useContext, useState, useEffect } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  sendEmailVerification,
  signInWithPopup
} from 'firebase/auth';
import { auth, googleProvider, db } from '../firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  async function signup(email, password, displayName) {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const isSpecialAdmin = email.toLowerCase() === 'brinleyww@gmail.com';
    
    // Create user document in Firestore
    await setDoc(doc(db, "users", userCredential.user.uid), {
      uid: userCredential.user.uid,
      email: email,
      displayName: displayName || email.split('@')[0],
      createdAt: new Date(),
      isAdmin: isSpecialAdmin
    });

    // Send verification email
    await sendEmailVerification(userCredential.user);
    
    return userCredential;
  }

  function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  function logout() {
    setIsAdmin(false);
    return signOut(auth);
  }

  async function loginWithGoogle() {
    const result = await signInWithPopup(auth, googleProvider);
    const isSpecialAdmin = result.user.email.toLowerCase() === 'brinleyww@gmail.com';
    
    // Check if user exists in Firestore, if not create them
    const userDocRef = doc(db, "users", result.user.uid);
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists()) {
      await setDoc(userDocRef, {
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName || result.user.email.split('@')[0],
        createdAt: new Date(),
        isAdmin: isSpecialAdmin
      });
    } else {
      // Ensure admin flag is set if they are the special admin
      if (isSpecialAdmin && !userDoc.data().isAdmin) {
        await setDoc(userDocRef, { isAdmin: true }, { merge: true });
      }
    }
    
    return result;
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async user => {
      setCurrentUser(user);
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setIsAdmin(data.isAdmin || user.email?.toLowerCase() === 'brinleyww@gmail.com');
          } else if (user.email?.toLowerCase() === 'brinleyww@gmail.com') {
             setIsAdmin(true);
          }
        } catch (e) {
          console.error("Error fetching user role", e);
        }
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    isAdmin,
    signup,
    login,
    logout,
    loginWithGoogle,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
