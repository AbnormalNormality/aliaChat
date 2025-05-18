import {
  getNickname,
  setUserNickname,
  sendMessage,
  listenMessages,
  signInWithGoogle,
  onAuthStateChange,
  getCurrentUser,
} from "./firebase-backend.js";

// DOM Elements
const signInBtn = document.getElementById("signInBtn");
const userInfo = document.getElementById("userInfo");
const userNameSpan = document.getElementById("userName");
const messagesDiv = document.getElementById("messages");
const inputSection = document.getElementById("inputSection");
const sendBtn = document.getElementById("sendBtn");
const messageInput = document.getElementById("messageInput");

let unsubscribeMessages = null;

signInBtn.addEventListener("click", async () => {
  signInBtn.disabled = true;
  await signInWithGoogle();
  signInBtn.disabled = false;
});

function displayMessages(messages) {
  messagesDiv.innerHTML = ""; // Clear old messages

  const reversed = [...messages].reverse(); // Newest first

  reversed.forEach((msg) => {
    const msgDiv = document.createElement("div");
    msgDiv.classList.add("message");

    const time =
      msg.timestamp instanceof Date ? msg.timestamp.toLocaleTimeString() : "";

    msgDiv.textContent = `${msg.nickname || "Anon"} (${time}): ${msg.text}`;
    messagesDiv.appendChild(msgDiv);
  });

  messagesDiv.scrollTop = 0; // Scroll to top to show newest message
}

async function handleUser(user) {
  if (!user) {
    userInfo.style.display = "none";
    inputSection.style.display = "none";
    signInBtn.style.display = "inline-block";
    messagesDiv.innerHTML = "";
    if (unsubscribeMessages) unsubscribeMessages();
    return;
  }

  // Get or prompt for nickname
  let nickname = await getNickname(user.uid);
  if (!nickname || nickname === "Anon") {
    nickname = prompt(
      "Please enter your nickname:\n(This cannot be changed later except by a developer)"
    );
    if (nickname && nickname.trim().length > 0) {
      nickname = nickname.trim();
    } else {
      nickname = (user.displayName || user.email || "").split(" ")[0];
    }
    await setUserNickname(user.uid, nickname);
  }

  userNameSpan.textContent = nickname;
  userInfo.style.display = "block";
  inputSection.style.display = "flex";
  signInBtn.style.display = "none";

  // Subscribe to messages
  if (unsubscribeMessages) unsubscribeMessages();
  unsubscribeMessages = listenMessages(displayMessages);
}

onAuthStateChange(handleUser);

sendBtn.addEventListener("click", async () => {
  const text = messageInput.value.trim();
  if (!text) return;

  const user = getCurrentUser();
  if (!user) {
    alert("You must be signed in to send messages.");
    return;
  }

  let nickname = await getNickname(user.uid);
  if (!nickname) {
    nickname = (user.displayName || user.email || "").split(" ")[0];
  }

  await sendMessage(user.uid, nickname, text);
  messageInput.value = "";
});

messageInput.addEventListener("keydown", function (event) {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault(); // Prevent newline
    sendBtn.click(); // Simulate clicking the send button
  }
});
