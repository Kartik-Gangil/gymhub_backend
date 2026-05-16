const express = require('express');
const router = express.Router();
const User = require('../model/user');
const Gym = require('../model/gym');


router.post('/add-gym/:owner', async (req, res) => {
    try {
        const { name, email, phone, address, city, state, description } = req.body;

        const { owner } = req.params;

        if (!name || !email || !phone || !address || !city || !state || !description || !owner)
            return res.status(400).json({ message: "All fields are required" })



        const newGym = new Gym({
            name, owner, email, address, city, state, description, phone, owner
        })

        await newGym.save();

        return res.status(201).json({ message: "Gym created successfully" })

    } catch (error) {
        console.log(error)
        return res.status(500).json({ message: "Internal server error" })
    }
})


router.get('/fetchGym/:id', async (req, res) => {
    try {

        const { id } = req.params;

        if (!id) return res.status(400).json({ messgae: "something went wronge" });

        const gym = await Gym.find({
            owner: id
        })
        
        return res.status(200).json({ gym })

    } catch (error) {
        console.log(error)
        return res.status(500).json({ message: "Internal server error" })
    }
})


router.get("/get-owner/:id", async (req, res) => {
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


router.get("/get-gym-detail/:id", async (req, res) => {
    try {
        const { id } = req.params;
        // console.log(id)
        if (!id) return res.status(400).json({ message: "Id is required" })

        const data = await Gym.findById(id).populate("plans");
        return res.status(200).json({ data })

    }
    catch (error) {
        console.log(error)
        return res.status(500).json({ message: "Internal server error" })
    }
})


router.post("/addPlan/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { name, price, days } = req.body;
        if (!id) return res.status(400).json({ message: "Id is required" })
        if (!name || !price || !days) return res.status(400).json({ message: "data is required" })

        const data = await Gym.findById(id);
        if (!data) return res.status(400).json({ message: "Internal server error" })

        const plan = { name, price, duration:days }
        const Plan = await Gym.findByIdAndUpdate(id,
            {
                $push: {
                    plans: plan
                }
            },
            { new: true }
        )

        return res.status(200).json({ Plan })



    } catch (error) {
        console.log(error)
        return res.status(500).json({ message: "Internal server error" })
    }
})


router.delete("/delete-plan/:gymId/:planId", async (req, res) => {
    try {
        const { gymId, planId } = req.params;

        if (!gymId || !planId) {
            return res.status(400).json({
                message: "Gym ID and Plan ID are required"
            });
        }

        const gym = await Gym.findById(gymId);

        if (!gym) {
            return res.status(404).json({
                message: "Gym not found"
            });
        }

        await Gym.findByIdAndUpdate(
            gymId,
            {
                $pull: {
                    plans: {
                        _id: planId
                    }
                }
            },
            { new: true }
        );

        return res.status(200).json({
            message: "Plan deleted successfully"
        });

    } catch (error) {
        console.log(error);

        return res.status(500).json({
            message: "Internal server error"
        });
    }
});


module.exports = router;