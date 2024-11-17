const mongoose=require("mongoose");
require("./post");
const postSchema = new mongoose.Schema({
    user:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"user"
    },
    date:{
        type:Date,
        default:Date.now
    },
    content:String,
    likes:[
        {
            type:mongoose.Schema.Types.ObjectId,
            ref:"user",
        }
    ],
});

// Export the model
module.exports = mongoose.model("post", postSchema);
