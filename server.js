// server.js - Error catching removed, console logs in routes commented

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
  console.error("ERROR: MONGODB_URI environment variable not set."); // Keeping config/startup errors
  process.exit(1);
}
mongoose.connect(process.env.MONGODB_URI);
mongoose.connection.on("connected", () => { console.log(`Connected to MongoDB ${mongoose.connection.name}.`); }); // Keeping connection logs
mongoose.connection.on('error', (err) => { console.error(`MongoDB connection error: ${err}`); process.exit(1); }); // Keeping connection errors

// --- Middleware ---
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: false }));
app.use(methodOverride("_method"));
app.use(morgan("dev")); // Keeping request logs from morgan

// --- Routes ---

// GET / - Home Page
app.get("/", (req, res) => {
   res.render("index.ejs");
   // console.error("Error rendering index page:", renderError);
});

// --- Customer Routes ---

// GET /customers/new - Show form
app.get("/customers/new", (req, res) => {
    res.render("customers/new.ejs");
    // console.error("Error rendering new customer form:", renderError);
});

// POST /customers - Create
app.post("/customers", async (req, res) => {
    // console.log("Creating customer with data:", req.body);
    const newCustomer = await Customer.create(req.body);
    // console.log("Created customer:", newCustomer);
    res.redirect('/customers');
    // console.error("Error creating customer:", error);
});

// GET /customers - List
app.get("/customers", async (req, res) => {
    const allCustomers = await Customer.find().sort({ name: 1 }).exec();
    res.render("customers/index.ejs", { customers: allCustomers });
    // console.error("Error fetching customers:", error);
});

// GET /customers/:customerId - Show
app.get("/customers/:customerId", async (req, res) => {
    const customerId = req.params.customerId;
    const foundCustomer = await Customer.findById(customerId).populate('pets', 'name type').exec();
    if (!foundCustomer) {
        return res.status(404).render('error.ejs', { errorMsg: "Customer not found" });
    }
    res.render("customers/show.ejs", { customer: foundCustomer });
    // console.error("Error fetching customer details:", error);
    // if (error.name === 'CastError') { return res.status(400).render('error.ejs', { errorMsg: "Invalid Customer ID format" }); }
});

// GET /customers/:customerId/edit - Show Edit Form
app.get("/customers/:customerId/edit", async (req, res) => {
    const customerId = req.params.customerId;
    const foundCustomer = await Customer.findById(customerId).exec();
    if (!foundCustomer) { return res.status(404).render('error.ejs', { errorMsg: "Customer not found" }); }
    res.render("customers/edit.ejs", { customer: foundCustomer });
    // console.error("Error fetching customer for edit:", error);
    // if (error.name === 'CastError') { return res.status(400).render('error.ejs', { errorMsg: "Invalid Customer ID format" }); }
});

// PUT /customers/:customerId - Update
app.put("/customers/:customerId", async (req, res) => {
    const customerId = req.params.customerId;
    const updatedCustomer = await Customer.findByIdAndUpdate(customerId, req.body, { new: true, runValidators: true }).exec();
    if (!updatedCustomer) {
        return res.status(404).send("Customer not found for update");
    }
    // console.log("Updated Customer:", updatedCustomer);
    res.redirect(`/customers/${customerId}`);
    // console.error("Error updating customer:", error);
});

// DELETE /customers/:customerId - Delete
app.delete("/customers/:customerId", async (req, res) => {
    const customerId = req.params.customerId;
    const deletedCustomer = await Customer.findByIdAndDelete(customerId).exec();
    if (!deletedCustomer) {
        // console.log(`Customer with ID ${customerId} not found for deletion.`);
        return res.redirect("/customers");
    }
    // console.log(`Successfully deleted customer: ${deletedCustomer.name}`);
    const updateResult = await Pet.updateMany({ customer: customerId }, { $set: { customer: null } }).exec();
    // console.log(`Orphaned ${updateResult.modifiedCount} pets previously owned by customer ${customerId}`);
    res.redirect("/customers");
    // console.error("Error deleting customer:", error);
});

// --- Pet Routes ---

// GET /pets/new - Show New Pet Form
app.get("/pets/new", async (req, res) => {
    const allCustomers = await Customer.find({}, 'name _id').sort({ name: 1 }).exec();
    res.render("pets/new.ejs", { customers: allCustomers });
    // console.error("Error fetching customers for new pet form:", error);
});

// POST /pets - Create Pet
app.post("/pets", async (req, res) => {
    const newPetData = req.body;
    const newPet = await Pet.create(newPetData);
    // console.log("Created Pet:", newPet);
    if (newPetData.customer) {
        const owner = await Customer.findById(newPetData.customer).exec();
        if (owner) {
            owner.pets.push(newPet._id);
            await owner.save();
            // console.log(`Updated customer ${owner.name} with new pet ${newPet.name}`);
        } else {
            // console.warn(`Owner not found for ID: ${newPetData.customer}`);
        }
    }
    res.redirect('/pets');
    // console.error("Error creating pet:", error);
});

// GET /pets - List Pets
app.get("/pets", async (req, res) => {
    const allPets = await Pet.find({}).populate('customer', 'name').sort({ name: 1 }).exec();
    res.render("pets/index.ejs", { pets: allPets });
    // console.error("Error fetching pets:", error);
});

// GET /pets/:petId - Show Pet
app.get("/pets/:petId", async (req, res) => {
    const petId = req.params.petId;
    const foundPet = await Pet.findById(petId).populate('customer', 'name email').exec();
    if (!foundPet) { return res.status(404).render('error.ejs', { errorMsg: "Pet not found" }); }
    res.render("pets/show.ejs", { pet: foundPet });
    // console.error("Error fetching pet details:", error);
    // if (error.name === 'CastError') { return res.status(400).render('error.ejs', { errorMsg: "Invalid Pet ID format" }); }
});

// GET /pets/:petId/edit - Show Edit Pet Form
app.get("/pets/:petId/edit", async (req, res) => {
    const petId = req.params.petId;
    const petToEdit = await Pet.findById(petId).exec();
    if (!petToEdit) { return res.status(404).render('error.ejs', { errorMsg: "Pet not found" }); }
    const allCustomers = await Customer.find({}, 'name _id').sort({ name: 1 }).exec();
    res.render("pets/edit.ejs", { pet: petToEdit, customers: allCustomers });
    // console.error("Error fetching pet for edit:", error);
    // if (error.name === 'CastError') { return res.status(400).render('error.ejs', { errorMsg: "Invalid Pet ID format" }); }
});

// PUT /pets/:petId - Update Pet
app.put("/pets/:petId", async (req, res) => {
    const petId = req.params.petId;
    const updatedPetData = req.body;
    const originalPet = await Pet.findById(petId, 'customer').exec();
    if (!originalPet) { return res.status(404).send("Pet not found for update."); }
    const oldOwnerId = originalPet.customer;
    const updatedPet = await Pet.findByIdAndUpdate(petId, updatedPetData, { new: true, runValidators: true }).exec();
    if (!updatedPet) { return res.status(404).send("Pet could not be updated."); }
    const newOwnerId = updatedPet.customer;
    if (oldOwnerId?.toString() !== newOwnerId?.toString()) {
        // console.log(`Owner changed for pet ${updatedPet.name}. Old: ${oldOwnerId}, New: ${newOwnerId}`);
        if (oldOwnerId) { await Customer.findByIdAndUpdate(oldOwnerId, { $pull: { pets: updatedPet._id } }).exec(); /* console.log(`Removed pet ${updatedPet.name} ref from old owner ${oldOwnerId}`); */ }
        if (newOwnerId) { await Customer.findByIdAndUpdate(newOwnerId, { $push: { pets: updatedPet._id } }).exec(); /* console.log(`Added pet ${updatedPet.name} ref to new owner ${newOwnerId}`); */ }
    }
    // console.log("Updated Pet:", updatedPet);
    res.redirect(`/pets/${petId}`);
    // console.error("Error updating pet:", error);
});

// DELETE /pets/:petId - Delete Pet
app.delete("/pets/:petId", async (req, res) => {
    const petId = req.params.petId;
    const deletedPet = await Pet.findByIdAndDelete(petId).exec();
    if (!deletedPet) { /* console.log(`Pet with ID ${petId} not found for deletion.`); */ return res.redirect('/pets'); }
    // console.log(`Deleted pet ${deletedPet.name}`);
    if (deletedPet.customer) { await Customer.findByIdAndUpdate(deletedPet.customer, { $pull: { pets: deletedPet._id } }).exec(); /* console.log(`Removed pet ${deletedPet.name} ref from owner ${deletedPet.customer}`); */ }
    res.redirect('/pets');
    // console.error("Error deleting pet:", error);
});

// --- Inventory Routes ---

// GET /inventory/new - Show New Item Form
app.get("/inventory/new", (req, res) => {
   res.render("inventory/new.ejs");
   // console.error("Error rendering new inventory form:", renderError);
});

// POST /inventory - Create Item
app.post("/inventory", async (req, res) => {
    const newItem = await Inventory.create(req.body);
    // console.log("Created Inventory Item:", newItem);
    res.redirect('/inventory');
    // console.error("Error creating inventory item:", error);
});

// GET /inventory - List Items
app.get("/inventory", async (req, res) => {
    const allItems = await Inventory.find().sort({ category: 1, itemName: 1 }).exec();
    res.render("inventory/index.ejs", { items: allItems });
    // console.error("Error fetching inventory:", error);
});

// GET /inventory/:itemId - Show Item
app.get("/inventory/:itemId", async (req, res) => {
    const itemId = req.params.itemId;
    const foundItem = await Inventory.findById(itemId).exec();
    if (!foundItem) { return res.status(404).render('error.ejs', { errorMsg: "Inventory item not found" }); }
    res.render("inventory/show.ejs", { item: foundItem });
    // console.error("Error fetching inventory item details:", error);
    // if (error.name === 'CastError') { return res.status(400).render('error.ejs', { errorMsg: "Invalid Inventory Item ID format" }); }
});

// GET /inventory/:itemId/edit - Show Edit Item Form
app.get("/inventory/:itemId/edit", async (req, res) => {
    const itemId = req.params.itemId;
    const itemToEdit = await Inventory.findById(itemId).exec();
    if (!itemToEdit) { return res.status(404).render('error.ejs', { errorMsg: "Inventory item not found" }); }
    res.render("inventory/edit.ejs", { item: itemToEdit });
    // console.error("Error fetching inventory item for edit:", error);
    // if (error.name === 'CastError') { return res.status(400).render('error.ejs', { errorMsg: "Invalid Inventory Item ID format" }); }
});

// PUT /inventory/:itemId - Update Item
app.put("/inventory/:itemId", async (req, res) => {
    const itemId = req.params.itemId;
    const updatedItem = await Inventory.findByIdAndUpdate(itemId, req.body, { new: true, runValidators: true }).exec();
    if (!updatedItem) { return res.status(404).send("Inventory item not found for update"); }
    // console.log("Updated Inventory Item:", updatedItem);
    res.redirect(`/inventory/${itemId}`);
    // console.error("Error updating inventory item:", error);
});

// DELETE /inventory/:itemId - Delete Item
app.delete("/inventory/:itemId", async (req, res) => {
    const itemId = req.params.itemId;
    const deletedItem = await Inventory.findByIdAndDelete(itemId).exec();
    if (!deletedItem) { /* console.log(`Inventory item with ID ${itemId} not found for deletion.`); */ return res.redirect('/inventory'); }
    // console.log(`Successfully deleted inventory item: ${deletedItem.itemName}`);
    res.redirect("/inventory");
    // console.error("Error deleting inventory item:", error);
});


// --- Catch-all for 404 Not Found ---
app.use((req, res) => {
   res.status(404).render('error.ejs', { errorMsg: `Page not found at ${req.originalUrl}` });
   // console.error("Error rendering 404 page:", renderError);
});


// --- Server Listener ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`); // Keeping server start logs
    console.log(`Server started at: ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })}`); // Keeping server start logs
});