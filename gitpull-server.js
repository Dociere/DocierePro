const express = require("express");
require("dotenv").config();
const cors = require("cors");
// const connectDB = require("./src/config/db.js");
// const userRoutes = require("./src/routes/userRoute.js");
// const documentRoutes = require("./src/routes/documentRoute.js");
// const editorRoutes = require("./src/routes/editingRoute.js");
// const lexMailRoute = require("./src/routes/mailRoute.js");
const awsRouter = require("../routes/awsRoutes.js");

const app = express();
const PORT = process.env.PORT || 3000;

connectDB();
app.use(express.json());
app.use(cors());

// app.use("/api/users", userRoutes);
// app.use("/api/doc", documentRoutes);
// app.use("/api/edit", editorRoutes);
// app.use("/api/lexmail", lexMailRoute);
app.use("/api/aws", awsRouter);

app.get("/", (req, res) => {
  res.send("Hello World");
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
