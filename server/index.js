const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 5000;
const path = require("path"); // ← Add this at the top

// Enable CORS for React dev server
app.use(
  cors({
    origin: "http://localhost:5173", // React app URL
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true, // if using cookies/auth
  })
);

//make folder images accessable through browser
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Parse JSON bodies
app.use(express.json());

// Import your login route
const loginRouter = require("./routes/getlogin");
const getUsersLoginRouter = require("./routes/getusers");
const uploadProfileRouter = require("./routes/uploadprofile");
const getAlluserMasterRouter = require("./routes/getAlluserMaster");
const adduserMasterRouter = require("./routes/addUserMaster");
const editUserMasterRouter = require("./routes/editUserMaster");
const testSmtpRouter = require("./routes/testSmtp");
const settingsRouter = require("./routes/settings");
const forgotPasswordRouter = require("./routes/forgotPassword");

//api for login
app.use("/api/login", loginRouter);

//getUserLogin
app.use("/api/users", getUsersLoginRouter);

//get userprofile
app.use("/api/usersprofile", uploadProfileRouter);

//for uploading image
app.use("/uploads", express.static("uploads"));

//get all user master
app.use("/api/getallusermaster", getAlluserMasterRouter);

//insert to user master
app.use("/api/addtousermaster", adduserMasterRouter);

//edit UserMaster
app.use("/api/editusermaster", editUserMasterRouter);

//smtp
app.use("/api/test-smtp", testSmtpRouter);
app.use("/api/settings", settingsRouter);

//forget password
app.use("/api/forgot-password", forgotPasswordRouter);

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
