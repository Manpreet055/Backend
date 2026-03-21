import mongoose from "mongoose"
 
const dbConnection = () => {
    mongoose.connect("mongodb+srv://Admin_Manpreet:6sB0FSdhKLRvoBhH@cluster1.wo7auap.mongodb.net/?appName=Cluster1/app").then((mongoose) => {
        console.log("DataBase connection established..")
        return mongoose
    }).catch((err) => {
        console.log("Something wrong happend.", err)
    })
}

export default dbConnection;