import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
// if ("serviceWorker" in navigator) {
//   navigator.serviceWorker
//     .register("/firebase-messaging-sw.js")
//     .then((registration) => {
//       console.log("Service Worker registered:", registration);
//     })
//     .catch((error) => {
//       console.error("Service Worker registration failed:", error);
//     });
// }
// // Firebase Configuration
// const firebaseConfig = {
//   apiKey: "AIzaSyAAUF5qzZrljXJjb96NmesXBydmn9Hmjss",
//   authDomain: "emsm-1d63e.firebaseapp.com",
//   projectId: "emsm-1d63e",
//   storageBucket: "emsm-1d63e.firebasestorage.app",
//   messagingSenderId: "98198623661",
//   appId: "1:98198623661:web:6e75496c45508cf37d7d24",
//   measurementId: "G-T7352X97BH"
// };

// // Initialize Firebase
// const app = initializeApp(firebaseConfig);
// const messaging = getMessaging(app);

// // Request Notification Permission
// async function requestNotificationPermission() {
//   const permission = await Notification.requestPermission();
//   if (permission === "granted") {
//       const token = await getToken(messaging, { vapidKey: "YOUR_VAPID_KEY" });
//       console.log("FCM Token:", token);
//   } else {
//       console.log("Notification permission denied");
//   }
// }

// Listen for messages when the app is open
// onMessage(messaging, (payload) => {
//   console.log("Foreground message received", payload);
//   new Notification(payload.notification.title, {
//     body: payload.notification.body,
//     icon: "/firebase-logo.png",
//   });
// });

// // Register service worker
// if ("serviceWorker" in navigator) {
//   navigator.serviceWorker.register("/firebase-messaging-sw.js").then((registration) => {
//     console.log("Service Worker registered:", registration);
//   });
// }

// Call function to ask for permission
// requestNotificationPermission();
