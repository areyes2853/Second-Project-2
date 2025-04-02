//start of the server
const express = require('express');
const path = require('path');
const app = express();
const dotenv = require("dotenv");
dotenv.config();
const mongoose = require('mongoose');
const methodOverride = require("method-override");
const morgan = require("morgan");

// --- Model Imports ---
const Pet = require('./models/pet.js');
const Customer = require('./models/customer.js');
const Inventory = require('./models/inventory.js'); // Verify path/name
const InStock = require('./models/inStock.js');   // Verify usage

// --- Database Connection ---
if (!process.env.MONGODB_URI) {
  console.error("ERROR: MONGODB_URI environment variable not set.");
  process.exit(1);
}
mongoose.connect(process.env.MONGODB_URI);
mongoose.connection.on("connected", () => { console.log(`Connected to MongoDB ${mongoose.connection.name}.`); });
mongoose.connection.on('error', (err) => { console.error(`MongoDB connection error: ${err}`); process.exit(1); });

// --- Middleware ---
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: false }));
app.use(methodOverride("_method"));
app.use(morgan("dev"));

// --- Routes ---

// GET / - Home Page
app.get("/", (req, res) => {
    // No async operations, try...catch not strictly needed but kept for pattern consistency if desired
    try {
       res.render("index.ejs");
    } catch(renderError) {
        console.error("Error rendering index page:", renderError);
        res.status(500).send("Error loading homepage."); // Basic fallback
    }
});

// --- Customer Routes ---

// GET /customers/new - Show form (No DB interaction)
app.get("/customers/new", (req, res) => {
    // No async operations, try...catch not strictly needed but kept for pattern consistency if desired
     try {
        res.render("customers/new.ejs");
     } catch(renderError) {
        console.error("Error rendering new customer form:", renderError);
        res.status(500).send("Error loading form.");
     }
});

// POST /customers - Create (NO try...catch)
app.post("/customers", async (req, res) => {
    // WARNING: Errors in Customer.create will crash the server
    console.log("Creating customer with data:", req.body);
    const newCustomer = await Customer.create(req.body);
    console.log("Created customer:", newCustomer);
    res.redirect('/customers');
});

// GET /customers - List (Keep try...catch)
app.get("/customers", async (req, res) => {
    try {
        const allCustomers = await Customer.find().sort({ name: 1 }).exec();
        res.render("customers/index.ejs", { customers: allCustomers });
    } catch (error) {
        console.error("Error fetching customers:", error);
        res.status(500).render('error.ejs', { errorMsg: "Error fetching customers list." });
    }
});

// GET /customers/:customerId - Show (Keep try...catch)
app.get("/customers/:customerId", async (req, res) => {
    try {
        const customerId = req.params.customerId;
        const foundCustomer = await Customer.findById(customerId).populate('pets', 'name type').exec();
        if (!foundCustomer) {
            return res.status(404).render('error.ejs', { errorMsg: "Customer not found" });
        }
        res.render("customers/show.ejs", { customer: foundCustomer });
    } catch (error) {
        console.error("Error fetching customer details:", error);
        if (error.name === 'CastError') { return res.status(400).render('error.ejs', { errorMsg: "Invalid Customer ID format" }); }
        res.status(500).render('error.ejs', { errorMsg: "Server error fetching customer details" });
    }
});

// GET /customers/:customerId/edit - Show Edit Form (Keep try...catch)
app.get("/customers/:customerId/edit", async (req, res) => {
    try {
        const customerId = req.params.customerId;
        const foundCustomer = await Customer.findById(customerId).exec();
        if (!foundCustomer) { return res.status(404).render('error.ejs', { errorMsg: "Customer not found" }); }
        res.render("customers/edit.ejs", { customer: foundCustomer });
    } catch (error) {
        console.error("Error fetching customer for edit:", error);
        if (error.name === 'CastError') { return res.status(400).render('error.ejs', { errorMsg: "Invalid Customer ID format" }); }
        res.status(500).render('error.ejs', { errorMsg: "Server error fetching customer for edit" });
    }
});

// PUT /customers/:customerId - Update (NO try...catch)
app.put("/customers/:customerId", async (req, res) => {
    // WARNING: Errors in findByIdAndUpdate will crash the server
    const customerId = req.params.customerId;
    const updatedCustomer = await Customer.findByIdAndUpdate(customerId, req.body, { new: true, runValidators: true }).exec();
    if (!updatedCustomer) {
        // Cannot render error page here without try...catch, this response might not work correctly if headers already sent
        return res.status(404).send("Customer not found for update"); // Changed from render
    }
    console.log("Updated Customer:", updatedCustomer);
    res.redirect(`/customers/${customerId}`);
});

// DELETE /customers/:customerId - Delete (NO try...catch)
app.delete("/customers/:customerId", async (req, res) => {
    // WARNING: Errors in findByIdAndDelete or Pet.updateMany will crash the server
    const customerId = req.params.customerId;
    const deletedCustomer = await Customer.findByIdAndDelete(customerId).exec();
    if (!deletedCustomer) {
        console.log(`Customer with ID ${customerId} not found for deletion.`);
        return res.redirect("/customers");
    }
    console.log(`Successfully deleted customer: ${deletedCustomer.name}`);
    const updateResult = await Pet.updateMany({ customer: customerId }, { $set: { customer: null } }).exec();
    console.log(`Orphaned ${updateResult.modifiedCount} pets previously owned by customer ${customerId}`);
    res.redirect("/customers");
});

// --- Pet Routes ---

// GET /pets/new - Show New Pet Form (Keep try...catch)
app.get("/pets/new", async (req, res) => {
    try {
        const allCustomers = await Customer.find({}, 'name _id').sort({ name: 1 }).exec();
        res.render("pets/new.ejs", { customers: allCustomers });
    } catch (error) {
        console.error("Error fetching customers for new pet form:", error);
        res.status(500).render('error.ejs', { errorMsg: "Error loading the page to add a new pet." });
    }
});

// POST /pets - Create Pet (NO try...catch)
app.post("/pets", async (req, res) => {
    // WARNING: Errors in Pet.create, Customer.findById, owner.save will crash the server
    const newPetData = req.body;
    const newPet = await Pet.create(newPetData);
    console.log("Created Pet:", newPet);
    if (newPetData.customer) {
        const owner = await Customer.findById(newPetData.customer).exec();
        if (owner) {
            owner.pets.push(newPet._id);
            await owner.save();
            console.log(`Updated customer ${owner.name} with new pet ${newPet.name}`);
        } else {
            console.warn(`Owner not found for ID: ${newPetData.customer}`);
        }
    }
    res.redirect('/pets');
});

// GET /pets - List Pets (Keep try...catch)
app.get("/pets", async (req, res) => {
    try {
        const allPets = await Pet.find({}).populate('customer', 'name').sort({ name: 1 }).exec();
        res.render("pets/index.ejs", { pets: allPets });
    } catch (error) {
        console.error("Error fetching pets:", error);
        res.status(500).render('error.ejs', { errorMsg: "Error fetching pets list." });
    }
});

// GET /pets/:petId - Show Pet (Keep try...catch)
app.get("/pets/:petId", async (req, res) => {
  try {
    const petId = req.params.petId;
    const foundPet = await Pet.findById(petId).populate('customer', 'name email').exec();
    if (!foundPet) { return res.status(404).render('error.ejs', { errorMsg: "Pet not found" }); }
    res.render("pets/show.ejs", { pet: foundPet });
  } catch (error) {
    console.error("Error fetching pet details:", error);
    if (error.name === 'CastError') { return res.status(400).render('error.ejs', { errorMsg: "Invalid Pet ID format" }); }
    res.status(500).render('error.ejs', { errorMsg: "Server error fetching pet details" });
  }
});

// GET /pets/:petId/edit - Show Edit Pet Form (Keep try...catch)
app.get("/pets/:petId/edit", async (req, res) => {
    try {
        const petId = req.params.petId;
        const petToEdit = await Pet.findById(petId).exec();
        if (!petToEdit) { return res.status(404).render('error.ejs', { errorMsg: "Pet not found" }); }
        const allCustomers = await Customer.find({}, 'name _id').sort({ name: 1 }).exec();
        res.render("pets/edit.ejs", { pet: petToEdit, customers: allCustomers });
    } catch (error) {
        console.error("Error fetching pet for edit:", error);
        if (error.name === 'CastError') { return res.status(400).render('error.ejs', { errorMsg: "Invalid Pet ID format" }); }
        res.status(500).render('error.ejs', { errorMsg: "Server error fetching pet for edit." });
    }
});

// PUT /pets/:petId - Update Pet (NO try...catch)
app.put("/pets/:petId", async (req, res) => {
    // WARNING: Errors in findById, findByIdAndUpdate, save will crash the server
    const petId = req.params.petId;
    const updatedPetData = req.body;
    const originalPet = await Pet.findById(petId, 'customer').exec();
    if (!originalPet) { return res.status(404).send("Pet not found for update."); } // Changed from render
    const oldOwnerId = originalPet.customer;
    const updatedPet = await Pet.findByIdAndUpdate(petId, updatedPetData, { new: true, runValidators: true }).exec();
    if (!updatedPet) { return res.status(404).send("Pet could not be updated."); } // Changed from render
    const newOwnerId = updatedPet.customer;
    if (oldOwnerId?.toString() !== newOwnerId?.toString()) {
        console.log(`Owner changed for pet ${updatedPet.name}. Old: ${oldOwnerId}, New: ${newOwnerId}`);
        if (oldOwnerId) { await Customer.findByIdAndUpdate(oldOwnerId, { $pull: { pets: updatedPet._id } }).exec(); console.log(`Removed pet ${updatedPet.name} ref from old owner ${oldOwnerId}`); }
        if (newOwnerId) { await Customer.findByIdAndUpdate(newOwnerId, { $push: { pets: updatedPet._id } }).exec(); console.log(`Added pet ${updatedPet.name} ref to new owner ${newOwnerId}`); }
    }
    console.log("Updated Pet:", updatedPet);
    res.redirect(`/pets/${petId}`);
});

// DELETE /pets/:petId - Delete Pet (NO try...catch)
app.delete("/pets/:petId", async (req, res) => {
    // WARNING: Errors in findByIdAndDelete, findByIdAndUpdate will crash the server
    const petId = req.params.petId;
    const deletedPet = await Pet.findByIdAndDelete(petId).exec();
    if (!deletedPet) { console.log(`Pet with ID ${petId} not found for deletion.`); return res.redirect('/pets'); }
    console.log(`Deleted pet ${deletedPet.name}`);
    if (deletedPet.customer) { await Customer.findByIdAndUpdate(deletedPet.customer, { $pull: { pets: deletedPet._id } }).exec(); console.log(`Removed pet ${deletedPet.name} ref from owner ${deletedPet.customer}`); }
    res.redirect('/pets');
});

// --- Inventory Routes ---

// GET /inventory/new - Show New Item Form (No DB interaction)
app.get("/inventory/new", (req, res) => {
     // No async operations, try...catch not strictly needed but kept for pattern consistency if desired
    try {
       res.render("inventory/new.ejs");
    } catch(renderError) {
        console.error("Error rendering new inventory form:", renderError);
        res.status(500).send("Error loading form.");
    }
});

// POST /inventory - Create Item (NO try...catch)
app.post("/inventory", async (req, res) => {
    // WARNING: Errors in Inventory.create will crash the server
    const newItem = await Inventory.create(req.body);
    console.log("Created Inventory Item:", newItem);
    res.redirect('/inventory');
});

// GET /inventory - List Items (Keep try...catch)
app.get("/inventory", async (req, res) => {
    try {
        const allItems = await Inventory.find().sort({ category: 1, itemName: 1 }).exec();
        res.render("inventory/index.ejs", { items: allItems });
    } catch (error) {
        console.error("Error fetching inventory:", error);
        res.status(500).render('error.ejs', { errorMsg: "Error fetching inventory list." });
    }
});

// GET /inventory/:itemId - Show Item (Keep try...catch)
app.get("/inventory/:itemId", async (req, res) => {
  try {
    const itemId = req.params.itemId;
    const foundItem = await Inventory.findById(itemId).exec();
    if (!foundItem) { return res.status(404).render('error.ejs', { errorMsg: "Inventory item not found" }); }
    res.render("inventory/show.ejs", { item: foundItem });
  } catch (error) {
    console.error("Error fetching inventory item details:", error);
    if (error.name === 'CastError') { return res.status(400).render('error.ejs', { errorMsg: "Invalid Inventory Item ID format" }); }
    res.status(500).render('error.ejs', { errorMsg: "Server error fetching inventory item details" });
  }
});

// GET /inventory/:itemId/edit - Show Edit Item Form (Keep try...catch)
app.get("/inventory/:itemId/edit", async (req, res) => {
    try {
        const itemId = req.params.itemId;
        const itemToEdit = await Inventory.findById(itemId).exec();
        if (!itemToEdit) { return res.status(404).render('error.ejs', { errorMsg: "Inventory item not found" }); }
        res.render("inventory/edit.ejs", { item: itemToEdit });
    } catch (error) {
        console.error("Error fetching inventory item for edit:", error);
        if (error.name === 'CastError') { return res.status(400).render('error.ejs', { errorMsg: "Invalid Inventory Item ID format" }); }
        res.status(500).render('error.ejs', { errorMsg: "Server error fetching inventory item for edit." });
    }
});

// PUT /inventory/:itemId - Update Item (NO try...catch)
app.put("/inventory/:itemId", async (req, res) => {
    // WARNING: Errors in findByIdAndUpdate will crash the server
    const itemId = req.params.itemId;
    const updatedItem = await Inventory.findByIdAndUpdate(itemId, req.body, { new: true, runValidators: true }).exec();
    if (!updatedItem) { return res.status(404).send("Inventory item not found for update"); } // Changed from render
    console.log("Updated Inventory Item:", updatedItem);
    res.redirect(`/inventory/${itemId}`);
});

// DELETE /inventory/:itemId - Delete Item (NO try...catch)
app.delete("/inventory/:itemId", async (req, res) => {
    // WARNING: Errors in findByIdAndDelete will crash the server
    const itemId = req.params.itemId;
    const deletedItem = await Inventory.findByIdAndDelete(itemId).exec();
    if (!deletedItem) { console.log(`Inventory item with ID ${itemId} not found for deletion.`); return res.redirect('/inventory'); }
    console.log(`Successfully deleted inventory item: ${deletedItem.itemName}`);
    res.redirect("/inventory");
});


// --- Catch-all for 404 Not Found ---
app.use((req, res) => {
    // No async operations, try...catch not strictly needed but kept for pattern consistency if desired
    try {
       res.status(404).render('error.ejs', { errorMsg: `Page not found at ${req.originalUrl}` });
    } catch (renderError) {
       console.error("Error rendering 404 page:", renderError);
       res.status(404).send("Page not found."); // Basic fallback
    }
});


// --- Server Listener ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
    // Adding current time might help with debugging restarts
    console.log(`Server started at: ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })}`);
});