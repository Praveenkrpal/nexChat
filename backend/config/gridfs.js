const mongoose = require("mongoose");

let gridFSBucket;

const initializeGridFS = () => {
  if (mongoose.connection.readyState !== 1) {
    throw new Error("MongoDB is not connected");
  }

  gridFSBucket = new mongoose.mongo.GridFSBucket(
    mongoose.connection.db,
    {
      bucketName: "nexchatFiles",
    }
  );

  console.log("GridFS initialized");
};

const getGridFSBucket = () => {
  if (!gridFSBucket) {
    throw new Error("GridFS has not been initialized");
  }

  return gridFSBucket;
};

module.exports = {
  initializeGridFS,
  getGridFSBucket,
};