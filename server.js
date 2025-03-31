// Here is where we import modules
// server.js

// server.js
const express = require('express');
const path = require('path');
const app = express();
const dotenv = require("dotenv");
dotenv.config()
const mongoose = require('mongoose');
const methodOverride = require("method-override"); // new
const morgan = require("morgan"); //new

// DB connection code

// Mount it along with our other middleware, ABOVE the routes
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: false }));
app.use(methodOverride("_method")); // new
app.use(morgan("dev")); //new

// routes below
const petStore = require("./models/petStore.js")
const Customer = require('./models/customer.js');
const InStock = require('./models/inStock.js');

mongoose.connect(process.env.MONGODB_URI);
// log connection status to terminal on start
mongoose.connection.on("connected", () => {
  console.log(`Connected to MongoDB ${mongoose.connection.name}.`);
});




app.listen(3000, () => {
  console.log("Listening on port 3000");
});


// GET /
app.get("/", async (req, res) => {
    res.render("index.ejs");
  });
  
  app.get("/customers/", async (req, res) => {
    res.render("./customers/new.ejs");
  });

  app.post("/customer",async (req, res)=>{
    console.log(req.body)
    await Customer.create(req.body)
    res.redirect('/customer/new')
  })

  app.get("/Pets/", async (req, res) => {
    res.render("./Pets/new.ejs");
  });

  app.get("/inventory", async (req, res) => {
    res.render("./inventory/new.ejs");
  });