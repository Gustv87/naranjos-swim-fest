import { initializeApp } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";
import { getAnalytics, isSupported } from "firebase/analytics";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);

const analyticsPromise = isSupported().then((supported) =>
  supported ? getAnalytics(app) : null
);

const appCheckSiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

if (typeof window !== "undefined" && appCheckSiteKey) {
  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(appCheckSiteKey),
    isTokenAutoRefreshEnabled: true,
  });
}

const db = getFirestore(app);

(async () => {
  try {
    await enableIndexedDbPersistence(db);
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('No se pudo habilitar persistencia offline de Firestore', error);
    }
  }
})();

const auth = getAuth(app);
const storage = getStorage(app);

export { app, db, auth, storage, analyticsPromise };
