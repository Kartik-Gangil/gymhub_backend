const express = require('express');
const router = express.Router();
const User = require('../model/user');
const Gym = require('../model/gym');


router.get("/get-member/:id", async (req, res) => {
    try {
        const { id } = req.params;
        if (!id)
            return res.status(400).json({ message: "Id is required" })

        const user = await User.findById(id);

        if (!user)
            return res.status(404).json({ message: "User not found" })

        return res.status(200).json({ user })
    } catch (error) {
        console.log(error)
        return res.status(500).json({ message: "Internal server error" })
    }
})




router.post('/purchase-plan', async (req, res) => {
    try {
        const { userId, plan, duration } = req.body;


    } catch (error) {
        console.log(error)
        return res.status(500).json({ message: "Internal server error" })
    }
})

module.exports = router;