const express = require('express');
const Gym = require('../model/gym');
const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const filter = req.query;
        const gyms = await Gym.find(filter);
        const GYMS = gyms.map(gym => {
            return {
                id: gym._id,
                name: gym.name,
                address: gym.address,
                city: gym.city,
                state: gym.state,
                logo: gym.logo || "",
                cover: gym.coverImage || "",
                members: gym.members.length || 0,
            }
        })
        return res.status(200).json({ gyms: GYMS });

    } catch (error) {
        console.log(error)
        return res.status(500).json({ message: "Internal server error" })
    }
})


router.get("/get-gym-detail/:id", async (req, res) => {
    try {
        const { id } = req.params; // This is the Gym ID
        if (!id) return res.status(400).json({ message: "Id is required" });

        // 1. Fetch the gym details first
        const gymDetails = await Gym.findById(id).populate("plans");
        if (!gymDetails) {
            return res.status(404).json({ message: "Gym not found" });
        }
        return res.status(200).json({
            data: {
                gymDetails
            }
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal server error" });
    }
});


module.exports = router;