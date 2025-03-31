// Here is where we import modules
// server.js

// server.js
const app = express();
const mongoose = require('mongoose');
const methodOverride = require("method-override"); // new
const morgan = require("morgan"); //new

// DB connection code

// Mount it along with our other middleware, ABOVE the routes
app.use(express.urlencoded({ extended: false }));
app.use(methodOverride("_method")); // new
app.use(morgan("dev")); //new

// routes below
const petStore = require("./models/petStore.js")
const Customer = require('./models/customer');
const InStock = require('.tou/models/inStock');

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
  