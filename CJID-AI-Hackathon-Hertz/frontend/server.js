// const express = require('express');
// const bodyParser = require('body-parser');
// const cors = require('cors');
// const admin = require('firebase-admin');

// const serviceAccount = require('./firebase-service-account.json');

// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount),
// });

// const db = admin.firestore(); // ✅ MOVE THIS after initializeApp()

// // Only use db after it's defined
// (async () => {
//   try {
//     const testDocRef = db.collection('testCollection').doc('testDoc');
//     await testDocRef.set({ hello: 'world' });
//     const doc = await testDocRef.get();
//     console.log('Test document data:', doc.data());
//   } catch (error) {
//     console.error('Firestore test failed:', error);
//   }
// })();

// const app = express();
// const PORT = process.env.PORT || 3000;

// app.use(cors());
// app.use(bodyParser.json());

// // ✅ Import routes AFTER Firebase is initialized
// const diagnosisRoutes = require('./routes/diagnosis');
// const heatmapRoutes = require('./routes/heatmap');

// // ✅ Use routes
// app.use('/api/diagnosis', diagnosisRoutes);
// app.use('/api/heatmap', heatmapRoutes);

// app.get('/', (req, res) => {
//   res.send('Symptom Tracker API is running');
// });

// app.listen(PORT, () => {
//   console.log(`✅ Server running on port ${PORT}`);
// });


const express = require('express');

const bodyParser = require('body-parser');

const cors = require('cors');

const admin = require('firebase-admin');

const serviceAccount = require('./firebase-service-account.json');



// Initialize Firebase

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
//   databaseURL: "https://your-project-id.firebaseio.com"
// REPLACE THE REAL URL OF YOUR FIREBASE SETUP
});  


const db = admin.firestore();

// Only use db after it's defined
(async () => {
  try {
    const testDocRef = db.collection('testCollection').doc('testDoc');
    await testDocRef.set({ hello: 'world' });
    const doc = await testDocRef.get();
    console.log('Test document data:', doc.data());
  } catch (error) {
    console.error('Firestore test failed:', error);
  }
})();

const app = express();
const PORT = process.env.PORT || 3000;


// Middleware

app.use(cors());
app.use(bodyParser.json());


// Basic route for testing

app.get('/', (req, res) => {
  res.send('Symptom Tracker API is running');
});


// Start server


app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
