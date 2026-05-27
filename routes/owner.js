const express = require('express');
const router = express.Router();
const fs = require('fs');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const User = require('../model/user');
const Gym = require('../model/gym');
const Membership = require('../model/membership');
const Plan = require('../model/plans');
const { config } = require('dotenv');

if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads', { recursive: true });
}

const upload = multer({ dest: 'uploads/' });

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
});

router.post('/add-gym/:owner', upload.single('image'), async (req, res) => {
    try {
        const { name, email, phone, address, city, state, description } = req.body;
        const { owner } = req.params;

        if (!name || !email || !phone || !address || !city || !state || !description || !owner)
            return res.status(400).json({ message: "All fields are required" })

        const user = await User.findById(owner);
        if (!user || user.role !== "owner") {
            return res.status(400).json({ message: "You are not Gym Owner" })
        }

        const gymData = { name, owner, email, address, city, state, description, phone };

        if (req.file) {
            const uploadResult = await cloudinary.uploader.upload(req.file.path, {
                folder: 'gymhub/gym_logos'
            });
            gymData.logo = cloudinary.url(uploadResult.public_id, {
                fetch_format: 'auto',
                quality: 'auto',
                crop: 'auto',
                gravity: 'auto',
                width: 500,
                height: 500,
            });
            gymData.logoPublicId = uploadResult.public_id;
            fs.unlink(req.file.path, err => {
                if (err) console.error('Failed to delete temp file:', err);
            });
        }

        const newGym = new Gym(gymData);
        await newGym.save();

        return res.status(201).json({ message: "Gym created successfully", gym: newGym })

    } catch (error) {
        console.log(error)
        return res.status(500).json({ message: "Internal server error" })
    }
})


router.get('/fetchGym/:id', async (req, res) => {
    try {

        const { id } = req.params;

        if (!id) return res.status(400).json({ message: "something went wrong" });

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
        const { id } = req.params; // This is the Gym ID
        if (!id) return res.status(400).json({ message: "Id is required" });

        // 1. Fetch the gym details first
        const gymDetails = await Gym.findById(id).populate("plans");
        if (!gymDetails) {
            return res.status(404).json({ message: "Gym not found" });
        }

        // 2. Find all membership documents linked to this gym and pull user data
        const activeMemberships = await Membership.find({ gym: id })
            .populate("user")  // This pulls full user object from the image's 'user' field
            .populate("plan") // This pulls full plan object from the image's 'plan' field
            .limit(10);
        const totalRevenue = activeMemberships.reduce((sum, membership) => {
            if (membership.status === "active" && membership.plan && membership.plan.price) {
                sum += membership.plan.price;
            }
            return sum;
        }, 0);
        // 3. Extract just the user data to create your clean members list
        const membersList = activeMemberships.map(memberDoc => memberDoc);

        // 4. Return everything together
        return res.status(200).json({
            data: {
                ...gymDetails.toObject(),
                members: membersList, // Injected straight into your expected layout!
                totalRevenue: totalRevenue
            }
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal server error" });
    }
});


router.get("/allMembers/:gymId", async (req, res) => {
    try {
        const { gymId } = req.params;
        if (!gymId) return res.status(400).json({ message: "Gym ID is required" });
        const memberships = await Membership.find({ gym: gymId }).populate("user").populate("plan");
        const members = memberships.map(membership => ({
            user: membership.user,
            plan: membership.plan,
            startDate: membership.startDate,
            endDate: membership.endDate,
            status: membership.status
        }));
        return res.status(200).json({ members });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal server error" });
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


        const newPlan = await Plan.create({
            gym: id, name, price: parseInt(price), days: parseInt(days)
        })

        await Gym.findByIdAndUpdate(
            id,
            {
                $push: {
                    plans: newPlan._id
                }
            }
        );

        return res.status(200).json({ message: "success", id: newPlan._id });



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

        await Plan.findByIdAndDelete(planId);
        await Gym.findByIdAndUpdate(
            gymId,
            {
                $pull: {
                    plans: planId
                }
            },
            { new: true }
        );
        await Membership.deleteMany({
            plan: planId
        });
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

router.put("/update-plan/:planId", async (req, res) => {
    try {
        const { planId } = req.params;
        const { name, price, days } = req.body;

        if (!planId) return res.status(400).json({ message: "Plan ID is required" });
        if (!name && !price && !days) return res.status(400).json({ message: "At least one field is required to update" });

        const plan = await Plan.findByIdAndUpdate(planId, { name, price: parseInt(price, 10), days: parseInt(days, 10) }, { new: true });
        
        if (!plan) return res.status(404).json({ message: "Plan not found" });
        
        return res.status(200).json({ message: "Plan updated successfully", plan });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Internal server error"
        });
    }
})


// Add timing to a gym
router.post('/add-timing/:gymId', async (req, res) => {
    try {
        const { gymId } = req.params;
        const { day, openTime, closeTime, type } = req.body;

        if (!gymId) return res.status(400).json({ message: 'Gym ID is required' });
        if (!day || !openTime || !closeTime || !type) return res.status(400).json({ message: 'day, openTime, closeTime and type are required' });

        // push timing object into gym.timings (or create timings array if not present)
        const updated = await Gym.findByIdAndUpdate(
            gymId,
            { $push: { timing: { day, open: openTime, close: closeTime, type } } },
            { new: true }
        );

        if (!updated) return res.status(404).json({ message: 'Gym not found' });

        return res.status(200).json({ message: 'Timing added', timings: updated.timing });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});


router.put("/updateMembershipStatus/:membershipId", async (req, res) => {
    try {
        const { membershipId } = req.params;
        const { status } = req.body;
        if (!membershipId) return res.status(400).json({ message: "Membership ID is required" });
        if (!status) return res.status(400).json({ message: "Status is required" });
        const updatedMembership = await Membership.findByIdAndUpdate(membershipId, { status }, { new: true });
        if (!updatedMembership) return res.status(404).json({ message: "Membership not found" });
        return res.status(200).json({ message: "Membership status updated", membership: updatedMembership });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal server error" });
    }
});

router.put("/updateGym/:gymId", upload.fields([{ name: "image" }, { name: "logo" }]), async (req, res) => {
    try {
        const { gymId } = req.params;
        const { name, email, phone, address, city, state, description } = req.body;
        if (!gymId) return res.status(400).json({ message: "Gym ID is required" });

        const gym = await Gym.findById(gymId);
        if (!gym) return res.status(404).json({ message: "Gym not found" });

        const updateData = {};

        if (name) updateData.name = name;
        if (email) updateData.email = email;
        if (phone) updateData.phone = phone;
        if (address) updateData.address = address;
        if (city) updateData.city = city;
        if (state) updateData.state = state;
        if (description) updateData.description = description;

        const imageFile = req.files?.image?.[0];
        const logoFile = req.files?.logo?.[0];

        if (imageFile) {
            const uploadResult = await cloudinary.uploader.upload(imageFile.path, {
                folder: 'gymhub/gym_covers'
            });
            const optimizeUrl = cloudinary.url(uploadResult.public_id, {
                fetch_format: 'auto',
                quality: 'auto'
            });
            updateData.coverImage = optimizeUrl;

            updateData.coverImagePublicId = uploadResult.public_id;
            if (gym.coverImagePublicId) {
                await cloudinary.uploader.destroy(gym.coverImagePublicId);
            }

            await fs.promises.unlink(imageFile.path);
        }

        if (logoFile) {
            const uploadResult = await cloudinary.uploader.upload(logoFile.path, {
                folder: 'gymhub/gym_logos'
            });
            const optimizeUrl = cloudinary.url(uploadResult.public_id, {
                fetch_format: 'auto',
                quality: 'auto',
                crop: 'auto',
                gravity: 'auto',
                width: 500,
                height: 500,
            });

            updateData.logo = optimizeUrl;
            updateData.logoPublicId = uploadResult.public_id;

            if (gym.logoPublicId) {
                await cloudinary.uploader.destroy(gym.logoPublicId);
            }

            await fs.promises.unlink(logoFile.path);
        }

        const updatedGym = await Gym.findByIdAndUpdate(
            gymId,
            updateData,
            { new: true, runValidators: true }
        );

        return res.status(200).json({ message: "Gym updated successfully", gym: updatedGym });
    }
    catch (error) {
        console.log(error);
        if (uploadedPublicId) {
            await cloudinary.uploader.destroy(uploadedPublicId)
        }
        return res.status(500).json({ message: "Internal server error" });
    }
})




module.exports = router;