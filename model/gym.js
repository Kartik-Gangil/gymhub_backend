const { Schema, model } = require("mongoose");

const gymSchema = new Schema({
    name: {
        required: true
        , type: String
    },
    owner: {
        required: true
        , type: Schema.Types.ObjectId
        , ref: "User"
    },
    email: {
        required: true
        , type: String
    },
    address: {
        required: true
        , type: String
    },
    city: {
        required: true
        , type: String
    },
    state: {
        required: true
        , type: String
    },
    phone: {
        required: true
        , type: String
    },
    description: {
        required: false
        , type: String
        , default: ""
    },
    timing: {
        required: true,
        default: [],
        type: [{
            day: String,
            open: String,
            close: String,
            type: String
        }]
    },
    members: {
        required: false
        , type: [Schema.Types.ObjectId]
        , default: []
    },
    plans: {
        required: false
        , type: [{
            name: String,
            price: Number,
            duration: String
        }]
        , default: []
    },
    createdAt: {
        required: true
        , type: Date
        , default: Date.now()
    },
    updatedAt: {
        required: true
        , type: Date
        , default: Date.now()
    }
})

module.exports = model("Gym", gymSchema);