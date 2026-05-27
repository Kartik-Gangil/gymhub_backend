const nodemailer = require('nodemailer')

const sendEmail = async (to, subject, text) => {
    let stat = false;
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to,
            subject,
            html: text
        });
        stat = true;
        return stat;
    } catch (error) {
        console.error('Error sending email:', error);
        throw new Error('Failed to send email');
        return stat;
    }
};

module.exports = { sendEmail };
