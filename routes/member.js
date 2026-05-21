const express = require('express');
const router = express.Router();
const User = require('../model/user');
const Gym = require('../model/gym');
const membership = require('../model/membership');
const Plan = require('../model/plans');


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
        const { userId, planID, GymID } = req.body;
        const gym = await Gym.findById(GymID);

        if (!gym) return res.status(404).json({ message: "not found" });

        const startDate = new Date();

        const endDate = new Date(startDate);

        const plan = gym.plans.find(item => item._id.toString() == planID);

        endDate.setDate(endDate.getDate() + parseInt(plan.duration));

        const member = new membership(
            { user: userId, plan: planID, gym: GymID, startDate, endDate }
        )
        await member.save();

        return res.status(200).json({ message: "plan purchased successfully" })
    } catch (error) {
        console.log(error)
        return res.status(500).json({ message: "Internal server error" })
    }
})

// Add member to gym as membership
router.post('/add-member/:gymId', async (req, res) => {
    try {
        const { gymId } = req.params;
        const { userId, planId, startDate, endDate, status } = req.body;

        if (!gymId) return res.status(400).json({ message: 'Gym ID is required' });
        if (!userId || !planId) return res.status(400).json({ message: 'User ID and Plan ID are required' });

        const gym = await Gym.findById(gymId);
        if (!gym) return res.status(404).json({ message: 'Gym not found' });

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const plan = await Plan.findById(planId);
        if (!plan) return res.status(404).json({ message: 'Plan not found' });

        const newMembership = await membership.create({
            gym: gymId,
            user: userId,
            plan: planId,
            startDate: startDate || new Date(),
            endDate: endDate || new Date(Date.now() + plan.days * 24 * 60 * 60 * 1000),
            status: status || 'active'
        });

        await Gym.findByIdAndUpdate(
            gymId,
            { $push: { members: newMembership._id } },
            { new: true }
        );

        await User.findByIdAndUpdate(
            userId,
            { $push: { membership: newMembership._id } },
            { new: true }
        );

        return res.status(201).json({ message: 'Member added successfully', membership: newMembership });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});


module.exports = router;