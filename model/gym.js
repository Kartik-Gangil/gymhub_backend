const { Schema, model } = require("mongoose");

const gymSchema = new Schema({
    name: {
        required: true
        , type: String
    },
    logo: {
        type: String,
        default: null
    },
    coverImage: {
        type: String,
        default: null
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
            type: { type: String }
        }]
    },
    plans: [{
        type: Schema.Types.ObjectId,
        ref: 'Plan'
    }],
    members: [{
        type: Schema.Types.ObjectId,
        ref: 'Membership'
    }]
},

    {
        timestamps: true,
    })


module.exports = model("Gym", gymSchema);