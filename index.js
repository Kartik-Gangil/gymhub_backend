const express = require('express');
const User = require('./model/user');
const cors = require('cors')
const { hashPassword, GenToken, comparePassword, GoogleLogin, GoogleCallback } = require('@kartikgangil/watchman_js');
const { config } = require('dotenv');
const { sendEmail } = require('./utils/emailService')
const { generateOTP } = require('./utils/generateOTP')
const connectDB = require('./controller/db');
config();

const app = express();
// use in the signup route to verify email via OTP
const otpStore = new Map();

app.use(express.json());
app.use(cors('*'));

const PORT = process.env.PORT || 8000;

const secret = process.env.JWT_SECRET;
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

connectDB()



app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: "All fields are required" });

    const user = await User.findOne({ email });

    if (!user)
      return res.status(404).json({ message: "user not found" });

    if (!user.password)
      return res.status(401).json({ message: "Invalid password" });

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

const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
app.post('/signup', async (req, res) => {
  try {
    const { name, email, phone, password, role, otp } = req.body;
    if (!email)
      return res.status(400).json({ message: "Email is required" });

    const user = await User.findOne({ email });
    if (user)
      return res.status(400).json({ message: "User already exists" });

    const stored = otpStore.get(email);

    if (!otp) {
      if (!name || !phone || !password || !role)
        return res.status(400).json({ message: "All fields are required to request OTP" });

      const generatedOtp = generateOTP();
      otpStore.set(email, {
        otp: generatedOtp,
        expiresAt: Date.now() + OTP_EXPIRY_MS,
        payload: { name, email, phone, password, role }
      });
      const emailSent = await sendEmail(email, "OTP for GYMHUB NEW ACCOUNT CREATION ", `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>GymHub OTP Verification</title>
</head>

<body style="
  margin:0;
  padding:0;
  background-color:#0f172a;
  font-family:Arial, sans-serif;
">

  <table
    width="100%"
    border="0"
    cellspacing="0"
    cellpadding="0"
    style="padding:40px 20px;"
  >
    <tr>
      <td align="center">

        <table
          width="100%"
          max-width="500"
          border="0"
          cellspacing="0"
          cellpadding="0"
          style="
            background:#111827;
            border-radius:20px;
            overflow:hidden;
            border:1px solid #1f2937;
          "
        >

          <!-- HEADER -->
          <tr>
            <td
              align="center"
              style="
                padding:40px 20px 20px;
              "
            >

              <p style="
                color:#FF6347;
                font-size:14px;
                font-weight:700;
                letter-spacing:2px;
                margin:0 0 12px;
                text-transform:uppercase;
              ">
                GymHub
              </p>

              <h1 style="
                color:#ffffff;
                margin:0;
                font-size:28px;
                font-weight:700;
                line-height:40px;
              ">
                Account Creation<br/>
                Verification OTP
              </h1>

              <p style="
                color:#9ca3af;
                font-size:15px;
                margin-top:18px;
                line-height:24px;
              ">
                Use the OTP below to verify your email
                and complete your GymHub account setup.
              </p>
            </td>
          </tr>

          <!-- OTP BOX -->
          <tr>
            <td align="center" style="padding:10px 20px 30px;">

              <div style="
                display:inline-block;
                background:#1f2937;
                color:#ffffff;
                font-size:36px;
                font-weight:700;
                letter-spacing:10px;
                padding:18px 32px;
                border-radius:16px;
                border:1px solid #374151;
              ">
                ${generatedOtp}
              </div>

            </td>
          </tr>

          <!-- MESSAGE -->
          <tr>
            <td
              align="center"
              style="
                padding:0 35px 30px;
              "
            >
              <p style="
                color:#d1d5db;
                font-size:15px;
                line-height:26px;
                margin:0;
              ">
                This OTP will expire in
                <span style="color:#ffffff;font-weight:700;">
                  5 minutes
                </span>.
              </p>

              <p style="
                color:#6b7280;
                font-size:13px;
                margin-top:20px;
                line-height:22px;
              ">
                If you didn’t request this verification,
                you can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td
              align="center"
              style="
                border-top:1px solid #1f2937;
                padding:20px;
              "
            >
              <p style="
                color:#6b7280;
                font-size:12px;
                margin:0;
              ">
                © 2026 GymHub. All rights reserved.
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>`);
      if (!emailSent) {
        otpStore.delete(email);
        return res.status(500).json({ message: "INVALID EMAIL" });
      }
      return res.status(200).json({
        message: "OTP sent to email. Verify OTP to complete signup.",
        email
      });
    }

    if (!stored)
      return res.status(400).json({ message: "OTP not requested or expired" });

    if (Date.now() > stored.expiresAt) {
      otpStore.delete(email);
      return res.status(400).json({ message: "OTP expired" });
    }

    if (stored.otp !== otp)
      return res.status(400).json({ message: "Invalid OTP" });

    const { name: storedName, phone: storedPhone, password: storedPassword, role: storedRole } = stored.payload;
    const hashedPass = await hashPassword(storedPassword);

    const newUser = new User({
      username: storedName,
      email,
      phone: storedPhone,
      password: hashedPass,
      role: storedRole
    })

    const NewUser = await newUser.save();
    otpStore.delete(email);

    const token = await GenToken({
      name: storedName, email, phone: storedPhone, role: storedRole
    },
      {
        expiresIn: '10h'
      },
      secret
    )

    return res.status(201).json({
      message: "User created successfully", token,
      user: {
        id: NewUser._id,
        email: email,
        user_metadata: {
          full_name: storedName,
          phone: storedPhone,
        }
      }, role: storedRole
    })

  } catch (error) {
    console.log(error)
    return res.status(500).json({ message: "Internal server error" })
  }
})
// google auth routes
app.get("/auth/google", (req, res) => {
  const uri = GoogleLogin(
    googleClientId,
    "https://n8n.creovavteio.in/api/auth/google/callback"
  );
  return res.status(302).redirect(uri);
});


app.get("/api/auth/google/callback", async (req, res) => {
  try {

    const code = req.query.code;

    if (!code) {
      return res.redirect(
        "gymhub://auth?error=google_auth_failed"
      );
    }

    // EXCHANGE CODE FOR GOOGLE USER
    const data = await GoogleCallback(
      code,
      googleClientId,
      googleClientSecret,
      "https://n8n.creovavteio.in/api/auth/google/callback"
    );

    if (!data?.user?.email) {
      return res.redirect(
        "gymhub://auth?error=no_email_found"
      );
    }

    // FIND USER
    let user = await User.findOne({
      email: data.user.email
    });

    // CREATE USER IF NOT EXISTS
    if (!user) {

      user = await User.create({
        username: data.user.name,
        profilePicture: data.user.picture,
        email: data.user.email,
        role: "member"
      });

    }

    // GENERATE JWT
    const token = await GenToken(
      {
        id: user._id,
        email: user.email,
        role: user.role
      },
      {
        expiresIn: "10h"
      },
      secret
    );

    // ONLY SEND TOKEN (RECOMMENDED)
    const redirectUrl =
      `gymhub://auth` +
      `?token=${token}` +
      `&email=${user.email}` +
      `&id=${user._id}` +
      `&username=${encodeURIComponent(user.username || "")}` +
      `&role=${user.role}` +
      `&profile=${encodeURIComponent(user.profilePicture || "")}`;

    return res.redirect(redirectUrl);

  } catch (error) {

    console.log("Google Callback Error:", error);

    return res.redirect(
      "gymhub://auth?error=server_error"
    );
  }
});


app.use('/view', require('./routes/view'));
app.use('/member', require('./routes/member'));
app.use('/owner', require('./routes/owner'));

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${ PORT } `);
});
