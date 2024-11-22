server.js

const express = require("express");
const cors = require("cors");
const path = require("path");
const db = require("./config/db"); // Database connection
const bcrypt = require("bcrypt"); // Optional: for password hashing

const app = express();

// Middleware setup
app.use(express.json()); // For parsing application/json
app.use(express.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded
app.use(cors());
app.use(express.static(path.join(__dirname, "../client/public")));

// Serve the login.html file
app.get("/signin", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/public/signin.html"));
});

app.get("/signinPage", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/public/signinPage.html"));
});

// Register a New User
app.post("/registerUser", async (req, res) => {
  const { first_name, last_name, contact_number, email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const query = `INSERT INTO Users (First_Name, Last_Name, Email_Address, Password, Contact_Number) VALUES (?, ?, ?, ?, ?)`;

    db.query(query, [first_name, last_name, email, hashedPassword, contact_number], (err, result) => {
      if (err) {
        if (err.code === "ER_DUP_ENTRY") {
          return res.status(409).json({ error: "Email already exists" });
        }
        return res.status(500).json({ error: "Failed to register user" });
      }
      res.status(201).json({ message: "User registered successfully" });
    });
  } catch (err) {
    res.status(500).json({ error: "An error occurred during registration" });
  }
});

// Authenticate a user (login)
app.post("/authenticate", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    // Query the Users table to find the user by email
    const query = "SELECT * FROM Users WHERE Email_Address = ?";
    db.query(query, [email], async (err, result) => {
      if (err) {
        return res.status(500).json({ error: "Failed to authenticate user" });
      }

      if (result.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      const user = result[0];
      const passwordMatch = await bcrypt.compare(password, user.Password);

      if (!passwordMatch) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      res.status(200).json({ message: "Login successful", userId: user.User_Id });
    });
  } catch (err) {
    res.status(500).json({ error: "An error occurred during authentication" });
  }
});

// Add a New Car
app.post("/add-car", (req, res) => {
  const {
    user_id,
    vehicle_name,
    vehicle_company,
    vehicle_type,
    vin_number,
    vehicle_model,
    manufacturing_year,
    horse_power,
    vehicle_mileage,
    num_doors,
    seats,
    transmission,
  } = req.body;

  // Validate required fields
  if (!user_id || !vehicle_name || !vin_number || !vehicle_model || !manufacturing_year) {
    return res.status(400).json({ error: "Missing required fields." });
  }

  const query = `
    INSERT INTO Vehicles 
    (User_Id, Vehicle_Name, Vehicle_Company, Vehicle_Type, VIN_Number, Vehicle_Model, 
     Manufacturing_Year, Horse_Power, Vehicle_Mileage, NumDoors, Seats, Transmission)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    user_id,
    vehicle_name,
    vehicle_company || null,
    vehicle_type || null,
    vin_number,
    vehicle_model,
    manufacturing_year,
    horse_power || null,
    vehicle_mileage || null,
    num_doors || null,
    seats || null,
    transmission || null,
  ];

  db.query(query, values, (err, result) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ error: err.sqlMessage || "Failed to add vehicle." });
    }

    res.status(201).json({ message: "Vehicle added successfully!", vehicleId: result.insertId });
  });
});

// Fetch all cars to dynamically update the webpage
app.get("/api/vehicles", (req, res) => {
  const query = "SELECT * FROM Vehicles";

  db.query(query, (err, results) => {
    if (err) {
      console.error("Error fetching vehicles:", err);
      return res.status(500).json({ error: "Failed to fetch vehicles." });
    }

    res.status(200).json(results);
  });
});

// Set up the server to listen
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}.`);
});

// API endpoint to fetch a specific vehicle by ID
app.get('/api/vehicles/:vehicleId', (req, res) => {
  const vehicleId = req.params.vehicleId;

  // Query to fetch vehicle details by ID
  const query = "SELECT * FROM Vehicles WHERE Vehicle_Id = ?";
  
  db.query(query, [vehicleId], (err, result) => {
    if (err) {
      console.error("Error fetching vehicle details:", err);
      return res.status(500).json({ error: "Failed to fetch car details." });
    }

    if (result.length === 0) {
      return res.status(404).json({ error: "Vehicle not found." });
    }

    res.status(200).json(result[0]); // Send the first result as the vehicle details
  });
});
