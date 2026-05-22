const express = require('express');
const router = express.Router();
const User = require('../model/user');
const Gym = require('../model/gym');
const Membership = require('../model/membership');
const Plan = require('../model/plans');


// Get a user by id
router.get("/get-member/:id", async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) return res.status(400).json({ message: "Id is required" });

        const user = await User.findById(id).select('-password');
        if (!user) return res.status(404).json({ message: "User not found" });

        return res.status(200).json({ user });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal server error" });
    }
});

// Get membership by id
router.get('/membership/:id', async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) return res.status(400).json({ message: 'Membership ID is required' });

        const membership = await Membership.findById(id)
            .populate('user', '-password')
            .populate('gym')
            .populate('plan');

        if (!membership) return res.status(404).json({ message: 'Membership not found' });

        return res.status(200).json({ membership });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});




// Purchase a plan (creates membership)
router.post('/purchase-plan', async (req, res) => {
    try {
        const { userId, planID, gymID } = req.body;
        if (!userId || !planID || !gymID) return res.status(400).json({ message: 'userId, planID and gymID are required' });

        const gym = await Gym.findById(gymID);
        if (!gym) return res.status(404).json({ message: 'Gym not found' });

        const plan = await Plan.findById(planID);
        if (!plan) return res.status(404).json({ message: 'Plan not found' });

        // ensure plan belongs to gym
        const planBelongsToGym = gym.plans.some(p => p.toString() === planID.toString());
        if (!planBelongsToGym) return res.status(400).json({ message: 'Plan does not belong to this gym' });

        const startDate = new Date();
        const endDate = new Date(startDate);
        const days = parseInt(plan.days) || 0;
        endDate.setDate(endDate.getDate() + days);

        const newMembership = await Membership.create({ user: userId, plan: planID, gym: gymID, startDate, endDate, status: 'active' });

        await Gym.findByIdAndUpdate(gymID, { $push: { members: newMembership._id } });
        await User.findByIdAndUpdate(userId, { $push: { membership: newMembership._id } });

        return res.status(201).json({ message: 'Plan purchased successfully', membership: newMembership });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});

// Add member to gym as membership (admin/owner use)
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

        const sDate = startDate ? new Date(startDate) : new Date();
        const eDate = endDate ? new Date(endDate) : new Date(sDate.getTime() + (plan.days || 0) * 24 * 60 * 60 * 1000);

        const newMembership = await Membership.create({
            gym: gymId,
            user: userId,
            plan: planId,
            startDate: sDate,
            endDate: eDate,
            status: status || 'active'
        });

        await Gym.findByIdAndUpdate(gymId, { $push: { members: newMembership._id } });
        await User.findByIdAndUpdate(userId, { $push: { membership: newMembership._id } });

        return res.status(201).json({ message: 'Member added successfully', membership: newMembership });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});

// List members for a gym
router.get('/gym/:gymId/members', async (req, res) => {
    try {
        const { gymId } = req.params;
        if (!gymId) return res.status(400).json({ message: 'Gym ID is required' });

        const memberships = await Membership.find({ gym: gymId }).populate('user', '-password').populate('plan');
        return res.status(200).json({ members: memberships });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});

// List memberships for a user
router.get('/user/:userId/memberships', async (req, res) => {
    try {
        const { userId } = req.params;
        if (!userId) return res.status(400).json({ message: 'User ID is required' });

        const memberships = await Membership.find({ user: userId }).populate('gym').populate('plan');
        return res.status(200).json({ memberships });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});

// Update membership (change plan, status, dates)
router.put('/membership/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        if (!id) return res.status(400).json({ message: 'Membership ID is required' });

        const membership = await Membership.findById(id);
        if (!membership) return res.status(404).json({ message: 'Membership not found' });

        // if plan change, adjust endDate if days provided
        if (updates.plan) {
            const plan = await Plan.findById(updates.plan);
            if (!plan) return res.status(404).json({ message: 'Plan not found' });
            membership.plan = updates.plan;
            if (!updates.endDate && plan.days) {
                const s = membership.startDate || new Date();
                membership.endDate = new Date(s.getTime() + plan.days * 24 * 60 * 60 * 1000);
            }
        }

        if (updates.startDate) membership.startDate = new Date(updates.startDate);
        if (updates.endDate) membership.endDate = new Date(updates.endDate);
        if (updates.status) membership.status = updates.status;

        await membership.save();
        return res.status(200).json({ message: 'Membership updated', membership });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});

// Cancel membership
router.post('/membership/:id/cancel', async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) return res.status(400).json({ message: 'Membership ID is required' });

        const membership = await Membership.findById(id);
        if (!membership) return res.status(404).json({ message: 'Membership not found' });

        membership.status = 'cancelled';
        await membership.save();
        return res.status(200).json({ message: 'Membership cancelled', membership });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});

// Delete membership
router.delete('/membership/:id', async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) return res.status(400).json({ message: 'Membership ID is required' });

        const membership = await Membership.findByIdAndDelete(id);
        if (!membership) return res.status(404).json({ message: 'Membership not found' });

        // remove references
        await Gym.findByIdAndUpdate(membership.gym, { $pull: { members: membership._id } });
        await User.findByIdAndUpdate(membership.user, { $pull: { membership: membership._id } });

        return res.status(200).json({ message: 'Membership deleted' });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});


module.exports = router;