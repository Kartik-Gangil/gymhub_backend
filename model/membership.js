const { Schema, model } = require("mongoose");

const membershipSchema = new Schema(
  {
    gym: {
      type: Schema.Types.ObjectId,
      ref: "Gym",
      required: true,
    },

    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    plan: {
      type: Schema.Types.ObjectId,
      ref:"Plan",
      required: true
    },

    startDate: {
      type: Date,
      default: Date.now,
    },

    endDate: {
      type: Date,
    },

    status: {
      type: String,
      enum: ["active", "expired", "cancelled"],
      default: "active",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = model("Membership", membershipSchema);