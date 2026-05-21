const express = require('express');
const User = require('./model/user');
const cors = require('cors')
const { hashPassword, GenToken, comparePassword } = require('@kartikgangil/watchman_js');
const { config } = require('dotenv');
const connectDB = require('./controller/db');
config();

const app = express();

app.use(express.json());
app.use(cors('*'));

const PORT = process.env.PORT || 8000;

const secret = process.env.JWT_SECRET;

connectDB()



app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password)
            return res.status(400).json({ message: "All fields are required" });

        const user = await User.findOne({ email });

        if (!user)
            return res.status(404).json({ message: "user not found" });



        if (!comparePassword(password, user.password))
            return res.status(401).json({ message: "Invalid password" });

        const token = await GenToken({
            user
        },
            {
                expiresIn: '10h'
            },
            secret
        )

        return res.status(200).json({
            token,
            user,
            role: user.role
        });
    }
    catch (error) {
        console.log(error)
        return res.status(500).json({ message: "Internal server error" });
    }
})


app.post('/signup', async (req, res) => {
    try {
        const { name, email, phone, password, role } = req.body;
        if (!name || !email || !phone || !password || !role)
            return res.status(400).json({ message: "All fields are required" })

        const user = await User.findOne({ email });

        if (user)
            return res.status(400).json({ message: "User already exists" })

        const hashedPass = await hashPassword(password);

        const newUser = new User({
            username: name,
            email,
            phone,
            password: hashedPass,
            role
        })

        const NewUser = await newUser.save();

        const token = await GenToken({
            name, email, phone, role
        },
            {
                expiresIn: '10h'
            },
            secret
        )
        // console.log({ token })

        return res.status(201).json({
            message: "User created successfully", token,
            user: {
                id: NewUser._id,
                email: email,
                user_metadata: {
                    full_name: name,
                    phone: phone,
                }
            }, role
        })

    } catch (error) {
        console.log(error)
        return res.status(500).json({ message: "Internal server error" })
    }
})

app.use('/view', require('./routes/view'));
app.use('/member', require('./routes/member'));
app.use('/owner', require('./routes/owner'));

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
});
