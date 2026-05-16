const mongoose = require("mongoose");
const { config } = require("dotenv")
config()

//  Function to connect to database 


const connectDB = async () => {
    try {
        await mongoose.connect(
            `${process.env.DB_URL}`
        );
        console.log("Database connected successfully");
    } catch (error) {
        console.log(`Database connection failed: ${error.message}`);
        process.exit(1);
    }
};


// Export the function 

module.exports = connectDB;