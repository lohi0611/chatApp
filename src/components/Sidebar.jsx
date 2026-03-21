import { useEffect, useState } from "react";
import { db } from "../firebase/config";
import { collection, onSnapshot, query, where, getDocs, doc, setDoc } from "firebase/firestore";
import "./Sidebar.css";

function Sidebar({ currentUser, userProfile, selectedUser, setSelectedUser }) {
  const [friends, setFriends] = useState([]);
  const [searchCode, setSearchCode] = useState("");
  const [status, setStatus] = useState("");

  // ✅ 1. Fetch only Friends from Firestore list
  useEffect(() => {
    if (!currentUser) return;

    // Use a subcollection path to fetch the friend list for the current user
    const unsubscribe = onSnapshot(collection(db, "friends", currentUser.uid, "list"), (snapshot) => {
      const friendList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setFriends(friendList);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // ✅ 2. Add Friend functionality
  const addFriend = async (e) => {
    if (e) e.preventDefault();
    if (!searchCode.trim()) return;
    
    // Check if the user is trying to add themselves
    if (searchCode.toUpperCase() === userProfile?.code) {
      setStatus("Cannot add yourself");
      return;
    }

    try {
      const q = query(collection(db, "users"), where("code", "==", searchCode.toUpperCase()));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const friendDoc = querySnapshot.docs[0];
        const friendData = friendDoc.data();

        // Save to current user's friend list
        await setDoc(doc(db, "friends", currentUser.uid, "list", friendData.uid), {
          uid: friendData.uid,
          name: friendData.name,
          photo: friendData.photo || null,
          email: friendData.email,
        });

        // Optional: Mirror friendship (add current user to the friend's list too)
        await setDoc(doc(db, "friends", friendData.uid, "list", currentUser.uid), {
          uid: currentUser.uid,
          name: currentUser.displayName,
          photo: currentUser.photoURL || null,
          email: currentUser.email,
        });

        setSearchCode("");
        setStatus("Friend added! 🎉");
        setTimeout(() => setStatus(""), 3000);
      } else {
        setStatus("Code not found ❌");
        setTimeout(() => setStatus(""), 3000);
      }
    } catch (error) {
      console.error("Error adding friend:", error);
      setStatus("Error finding user");
    }
  };

  const getInitials = (name) => {
    if (!name) return "?";
    return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
  };

  return (
    <aside className="sidebar">
      {/* 👤 My Profile / Code Info */}
      <div className="sidebar-me">
        <div className="me-header">
          <span className="me-label">My Code</span>
          <span className="me-code" onClick={() => navigator.clipboard.writeText(userProfile?.code)} title="Click to copy!">
            {userProfile?.code || "------"} 📋
          </span>
        </div>
      </div>

      {/* 🔍 Search / Add Friend */}
      <div className="sidebar-search">
        <form onSubmit={addFriend} className="search-form">
          <input
            type="text"
            className="search-input"
            placeholder="Enter friend code..."
            value={searchCode}
            onChange={(e) => setSearchCode(e.target.value)}
          />
          <button type="submit" className="add-friend-btn">Add</button>
        </form>
        {status && <div className="search-status">{status}</div>}
      </div>

      <div className="sidebar-header">
        <h3>Friends</h3>
        <span className="user-count">{friends.length}</span>
      </div>

      {/* 👥 Friend List */}
      <div className="sidebar-list">
        {friends.map((friend) => {
          const isSelected = selectedUser?.uid === friend.uid;

          return (
            <div
              key={friend.uid}
              onClick={() => setSelectedUser(friend)}
              className={`sidebar-user-item ${isSelected ? "sidebar-user-item--active" : ""}`}
            >
              <div className="user-avatar-container">
                {friend.photo ? (
                  <img src={friend.photo} alt={friend.name} className="user-avatar" referrerPolicy="no-referrer" />
                ) : (
                  <div className="user-avatar-fallback">{getInitials(friend.name)}</div>
                )}
              </div>
              <div className="user-info">
                <div className="user-name">{friend.name}</div>
                <div className="user-status">Friend</div>
              </div>
              {isSelected && <div className="active-marker"></div>}
            </div>
          );
        })}

        {friends.length === 0 && (
          <div className="sidebar-empty">
            <p>Your friend list is empty.</p>
            <p className="sidebar-empty-hint">Enter a code above to add your first friend!</p>
          </div>
        )}
      </div>
    </aside>
  );
}

export default Sidebar;
