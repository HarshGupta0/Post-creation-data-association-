require('dotenv').config();  // Load .env variables
const express = require('express');
const app = express();
const mongoose = require('mongoose');
const userModel = require('./models/user');
const postModel = require("./models/post");
const cookieParser = require('cookie-parser');
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const post = require('./models/post');

// Use environment variables for sensitive information
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;
const JWT_SECRET = process.env.JWT_SECRET;
const SALT_ROUNDS = parseInt(process.env.SALT_ROUNDS, 10);

// Connect to MongoDB
mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log("Connected to the database");
}).catch((error) => {
    console.error("Database connection error:", error);
});

app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get('/', (req, res) => {
    res.render("index");
});

app.post('/register', async (req, res) => {
    let user = await userModel.findOne({ email: req.body.email });
    if (user) {
        return res.status(500).send("User already registered");
    }

    bcrypt.genSalt(SALT_ROUNDS, (err, salt) => {
        if (err) return res.status(500).send("Error generating salt");

        bcrypt.hash(req.body.password, salt, async (err, hash) => {
            if (err) return res.status(500).send("Error hashing password");

            let newUser = await userModel.create({
                name: req.body.name,
                username: req.body.username,
                age: req.body.age,
                email: req.body.email,
                password: hash
            });

            let token = jwt.sign({ email: req.body.email, userid: newUser._id }, JWT_SECRET);
            res.cookie("token", token);
            res.redirect("/login");
        });
    });
});

app.get('/login', (req, res) => {
    res.render("login");
});

app.post('/login', async (req, res) => {
    let user = await userModel.findOne({ email: req.body.email });
    if (!user) {
        return res.status(500).send("Something went wrong");
    }

    bcrypt.compare(req.body.password, user.password, (err, result) => {
        if (err) return res.status(500).send("Error comparing passwords");

        if (result) {
            let token = jwt.sign({ email: req.body.email, userid: user._id }, JWT_SECRET);
            res.cookie("token", token);
            res.status(200).redirect("/profile");
        } else {
            res.redirect("/login");
        }
    });
});

app.get("/logout", (req, res) => {
    res.cookie("token", "");
    res.redirect("/login");
});

// Protected routes middleware
function isLoggedIn(req, res, next) {
    const token = req.cookies.token;

    if (!token) {
        return res.status(401).send("You must be logged in");
    }

    jwt.verify(token, JWT_SECRET, (err, data) => {
        if (err) return res.status(403).send("Invalid token");

        req.user = data;
        next();
    });
}

app.get('/profile', isLoggedIn, async(req, res) => {
    let user = await userModel.findOne({email:req.user.email}).populate('posts');
    res.render("profile",{user});
});

app.post('/create-post', isLoggedIn, async(req, res) => {
    let user = await userModel.findOne({email:req.user.email});
    let post=await postModel.create({
        user:user._id,
        content:req.body.content,
    });
    user.posts.push(post._id);
    await user.save();
    res.redirect("/profile");
});
app.get('/like-post/:id', isLoggedIn, async(req, res) => {
    // Retrieve the post using postModel, not userModel
    let post = await postModel.findOne({_id: req.params.id});

    // Check if the user has already liked the post
    if (post.likes.indexOf(req.user.userid) === -1) {
        // If not liked, add the user's ID to the likes array
        post.likes.push(req.user.userid);
    } else {
        // If already liked, remove the user's ID from the likes array
        post.likes.splice(post.likes.indexOf(req.user.userid), 1);
    }
    await post.save();
    res.redirect('/profile');
});
app.get('/edit-post/:id', isLoggedIn, async (req, res) => {
    const post = await postModel.findById(req.params.id);
    if (post) {
        res.render('edit', { post });
    } else {
        res.redirect('/profile');
    }
});
app.post('/update-post/:id', isLoggedIn, async (req, res) => {
    const { content } = req.body;
    try {
        await postModel.findByIdAndUpdate(req.params.id, { content });
        res.redirect('/profile');
    } catch (error) {
        res.redirect('/edit-post/' + req.params.id);
    }
});


app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
