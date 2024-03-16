const express = require('express');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');
const path = require('path');
const bcrypt = require('bcrypt');

const app = express();

// Initialize Firebase Admin SDK
const serviceAccount = require('./serviceAccountKey.json'); // You need to download this from Firebase console
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// Set EJS as the view engine
app.set('view engine', 'ejs');

// Set views directory
app.set('views', path.join(__dirname, 'views'));

// Body parser middleware
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Number of salt rounds for bcrypt hashing
const saltRounds = 10;

// Route for rendering the signup form
app.get('/signup', (req, res) => {
  res.render('signup');
});

// Route for handling signup form submission
app.post('/signup', async (req, res) => {
  const { email, password } = req.body;
  try {
    // Check if email already exists
    const existingUser = await db.collection('users').where('email', '==', email).get();

    if (!existingUser.empty) {
      return res.status(400).send('Email already exists');
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Save user data directly in Firestore
    const userDocRef = await db.collection('users').add({
      email,
      password: hashedPassword, // Store hashed password
    });

    // Redirect to login page after successful signup
    res.redirect('/login');
  } catch (error) {
    res.status(500).send('Error: ' + error.message);
  }
});


// Route for rendering the login form
app.get('/login', (req, res) => {
  res.render('login');
});

// Route for handling login form submission
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    // Query Firestore to find user with given email
    const userQuery = await db.collection('users').where('email', '==', email).get();

    if (userQuery.empty) {
      return res.status(401).send('Invalid email or password');
    }

    const userData = userQuery.docs[0].data();
    const hashedPassword = userData.password;

    // Compare hashed password with input password
    const passwordMatch = await bcrypt.compare(password, hashedPassword);

    if (passwordMatch) {
      res.redirect('/dashboard'); // Redirect to dashboard after successful login
    } else {
      res.status(401).send('Invalid email or password');
    }
  } catch (error) {
    res.status(500).send('Error: ' + error.message);
  }
});


const fetch = require('node-fetch'); // Require node-fetch to make HTTP requests
// Route for rendering the dashboard
app.get('/dashboard', async (req, res) => {
  try {
    // Get the search term (assuming it's passed as a query parameter)
    const searchTerm = req.query.q || 'spyderman'; // Default search term is 'nature'

    // Fetch images from Unsplash API
    const response = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(searchTerm)}&client_id=WtO3I7fKRKgm4n9-fqWn2mw4RzSFB3fFkSPb2h51fqo`);
    const data = await response.json();

    // Check if there are any results
    if (!data.results || data.results.length === 0) {
      return res.render('dashboard', { images: [] }); // Render with empty images array
    }

    // Render the dashboard with the images
    res.render('dashboard', { images: data.results });
  } catch (error) {
    console.error('Error fetching images:', error);
    res.status(500).send('Error fetching images');
  }
});


app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
