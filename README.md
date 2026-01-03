# Poker Profiles

This is a small static site to manage poker player profiles. By default it stores data in each visitor's browser (localStorage). I added an optional Firebase Firestore integration so the site can be edited by anyone with the link (shared live data).

How it works
- If you create `js/firebase-config.js` with your Firebase project's config (see `js/firebase-config.example.js`), the site will connect to Firestore and all visitors will read/write the shared `players` collection.
- If `js/firebase-config.js` is missing, the app falls back to localStorage (private to each browser).

Make the site publicly editable (quick steps)
1. Create a Firebase project in the Firebase console: https://console.firebase.google.com/
2. In the project, go to Firestore Database → Create database → Start in test mode (or set rules below).
3. Add a Web app and copy the Firebase config values (apiKey, projectId, etc.).
4. In the repo create a file `js/firebase-config.js` and paste the config as in `js/firebase-config.example.js`.
5. Edit Firestore rules to allow public read/write (test mode):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

Security warning
- The above rules make your database readable and writable by anyone on the Internet. This is convenient for demo/testing but not safe for production. You will likely get spam, abusive writes, or data deletion if rules are open.
- To add basic protection, consider requiring Firebase Authentication for writes, or add server-side validation, or set stricter rules.

If you want, I can help you set up Firebase Authentication and moderate writes, or implement a PR-based submission flow instead (safer). 
