import { useState } from "react";
import { signInWithPopup, GoogleAuthProvider, signOut } from "firebase/auth";
import { auth, db } from "./firebase/config";
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { useEffect } from "react";
import ChatWindow from "./components/ChatWindow";
import Sidebar from "./components/Sidebar";
import "./App.css";

const provider = new GoogleAuthProvider();

function App() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);

  const generateCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const login = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const loggedInUser = result.user;

      // ✅ Check if user already exists
      const userRef = doc(db, "users", loggedInUser.uid);
      const userSnap = await getDoc(userRef);
      
      let profileData;

      if (!userSnap.exists()) {
        profileData = {
          uid: loggedInUser.uid,
          name: loggedInUser.displayName,
          email: loggedInUser.email,
          photo: loggedInUser.photoURL,
          code: generateCode(),
          lastSeen: new Date(),
        };
        await setDoc(userRef, profileData);
      } else {
        profileData = userSnap.data();
        // ✅ If existing user is missing a code, generate one now
        if (!profileData.code) {
          profileData.code = generateCode();
          await setDoc(userRef, { code: profileData.code }, { merge: true });
        }
        // Update last seen
        await setDoc(userRef, { lastSeen: new Date() }, { merge: true });
      }

      setUserProfile(profileData);
      setUser(loggedInUser);

      // ✅ 1. Mark Online
      await updateDoc(userRef, {
        online: true,
      });

    } catch (error) {
      console.error(error);
    }
  };

  // ✅ 2. Handle Online/Offline Status (Presence)
  useEffect(() => {
    if (!user) return;

    const userRef = doc(db, "users", user.uid);

    const setOffline = async () => {
      await updateDoc(userRef, {
        online: false,
        lastSeen: serverTimestamp(),
        typing: false
      });
    };

    const handleUnload = () => {
      setOffline();
    };

    window.addEventListener("beforeunload", handleUnload);

    return () => {
      window.removeEventListener("beforeunload", handleUnload);
      setOffline();
    };
  }, [user]);

  const logout = async () => {
    try {
      if (user) {
        // Mark offline before sign-out
        await updateDoc(doc(db, "users", user.uid), {
          online: false,
          lastSeen: serverTimestamp(),
          typing: false
        });
      }
      await signOut(auth);
      setUser(null);
      setUserProfile(null);
      setSelectedUser(null);
    } catch (error) {
      console.error(error);
    }
  };

  const getInitials = (name) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      {/* Animated Background */}
      <div className="app-bg">
        <div className="orb orb--1"></div>
        <div className="orb orb--2"></div>
        <div className="orb orb--3"></div>
      </div>

      <div className="app">
        {user ? (
          <div className="chat-layout">
            {/* Top Bar */}
            <header className="topbar">
              <div className="topbar-left">
                <div className="topbar-logo" aria-hidden="true">
                  💬
                </div>
                <div>
                  <div className="topbar-title">ChatFlow</div>
                  <div className="topbar-status">
                    <span className="topbar-status-dot"></span>
                    Online
                  </div>
                </div>
              </div>

              <div className="topbar-right">
                <div className="topbar-user">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName}
                      className="topbar-avatar"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="topbar-avatar-fallback">
                      {getInitials(user.displayName)}
                    </div>
                  )}
                  <span className="topbar-username">
                    {user.displayName || user.email}
                  </span>
                </div>
                <button
                  className="logout-btn"
                  onClick={logout}
                  id="logout-button"
                >
                  Sign out
                </button>
              </div>
            </header>

            {/* Chat Layout */}
            <div className="main-content">
              <Sidebar
                currentUser={user}
                userProfile={userProfile}
                selectedUser={selectedUser}
                setSelectedUser={setSelectedUser}
              />

              <main className="chat-window-container">
                {selectedUser ? (
                  <ChatWindow user={user} selectedUser={selectedUser} />
                ) : (
                  <div className="welcome-screen">
                    <div className="welcome-icon">💬</div>
                    <h2>Welcome to ChatFlow</h2>
                    <p>Select a contact to start messaging privately.</p>
                  </div>
                )}
              </main>
            </div>
          </div>
        ) : (
          <div className="login-screen">
            <div className="login-card">
              <div className="login-icon" aria-hidden="true">
                💬
              </div>
              <h1 className="login-title">ChatFlow</h1>
              <p className="login-subtitle">
                A beautiful, real-time messaging experience.
                <br />
                Sign in to start chatting instantly.
              </p>

              <button
                className="login-btn"
                onClick={login}
                id="login-button"
              >
                <svg viewBox="0 0 24 24" fill="none">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Continue with Google
              </button>

              <div className="login-features">
                <div className="login-feature">
                  <span className="login-feature-icon">⚡</span>
                  <span className="login-feature-label">Real-time</span>
                </div>
                <div className="login-feature">
                  <span className="login-feature-icon">🔒</span>
                  <span className="login-feature-label">Secure</span>
                </div>
                <div className="login-feature">
                  <span className="login-feature-icon">🌐</span>
                  <span className="login-feature-label">Global</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default App;
