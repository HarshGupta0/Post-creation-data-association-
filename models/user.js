const mongoose = require('mongoose');
require("./post")
// Define user schema
const userSchema = new mongoose.Schema({
    username: { type: String, required: true },
    name: { type: String, required: true },
    age: { type: Number, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    posts:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:"post",
    }]
});

// Export the model
module.exports = mongoose.model("user", userSchema);
