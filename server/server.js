const express = require("express");
const cors = require("cors");
const path = require("path");
const session = require("express-session");
const db = require("./config/db");
const bcrypt = require("bcrypt");

const app = express();

// Middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(express.static(path.join(__dirname, "../client/public")));

// Configure session middleware
app.use(
  session({
    secret: "your_secret_key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Use true if using HTTPS
      maxAge: 1000 * 60 * 60 * 24, // 1 day
    },
  })
);

// Global middleware to redirect unauthenticated users
app.use((req, res, next) => {
  const publicRoutes = ["/signin", "/registerUser", "/authenticate"];
  
  // Allow access to public routes
  if (publicRoutes.includes(req.path)) {
    return next();
  }

  // Check if the user is authenticated
  if (req.session && req.session.user_id) {
    return next();
  }

  // Redirect to login page if not authenticated
  return res.redirect("/signin");
});

// Routes
app.get("/signin", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/public/signin.html"));
});

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

app.post("/authenticate", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
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

      req.session.user_id = user.User_Id;
      res.status(200).json({ message: "Login successful", userId: user.User_Id });
    });
  } catch (err) {
    res.status(500).json({ error: "An error occurred during authentication" });
  }
});

app.post("/add-car", (req, res) => {
  const user_id = req.session.user_id;

  const {
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

  if (!vehicle_name || !vin_number || !vehicle_model || !manufacturing_year) {
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


app.get('/api/vehicles/:vehicleId', (req, res) => {
  console.log("Received request for Vehicle ID:", req.params.vehicleId);

  const vehicleId = parseInt(req.params.vehicleId);

  console.log("Vehicle ID:", vehicleId);

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




app.post("/logout", (req, res) => {
  req.session.destroy((err))
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: "Failed to log out." });
    }
    res.clearCookie("connect.sid");
    res.status(200).json({ message: "Logged out successfully." });
  });
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}.`);
  console.log('server is running');
});
