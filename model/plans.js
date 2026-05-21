const { Schema, model } = require("mongoose");

const planSchema = new Schema({
    gym: {
        type: Schema.Types.ObjectId,
        ref: "Gym"
    },

    name: String,
    price: Number,
    days: Number
});

module.exports = model("Plan", planSchema)