import mongoose from "mongoose";

const dbConnection = () => {
  mongoose
    .connect(process.env.MONGO_URI)
    .then((mongoose) => {
      console.log("DataBase connection established..");
      return mongoose;
    })
    .catch((err) => {
      console.log("Something wrong happend.", err);
    });
};

export default dbConnection;
