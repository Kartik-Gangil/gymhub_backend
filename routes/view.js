const express = require('express');
const Gym = require('../model/gym');
const router = express.Router();

router.get('/', async (req, res) => {
    try {

        const gyms = await Gym.find(); 

        return res.status(200).json({data:gyms});

    } catch (error) {
        console.log(error)
        return res.status(500).json({ message: "Internal server error" })
    }
})

module.exports = router;