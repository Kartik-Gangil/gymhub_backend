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
    role: {
        enum: ["admin", "member", "owner"]
        , default: "member"
        , type: String
    },
    membership: [
        {
            type: Schema.Types.ObjectId,
            ref: 'Membership'
        }
    ]
}, {
    timestamps: true
})

module.exports = model('User', userSchema);