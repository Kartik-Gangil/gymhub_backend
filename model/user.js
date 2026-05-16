const { Schema, model } = require('mongoose')

const userSchema = new Schema({
    username: {
        required: true
        , type: String
    },
    email: {
        required: true
        , type: String
    },
    phone: {
        required: true
        , type: String
    },
    password: {
        required: true
        , type: String
    },
    gymName: {
        required: false
        , type: String
        , default: ""
    },
    role: {
        enum: ["admin", "member", "owner"]
        , default: "member"
        , type: String
    },
    // plan: {
    //     required: true
    //     , type: String
    // },
    // duration: {
    //     required: true
    //     , type: Number
    // },
    // startDate: {
    //     required: true
    //     , type: Date
    // },
    // endDate: {
    //     required: true
    //     , type: Date,
    //     default: Date.now()
    // },
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

module.exports = model('User', userSchema);