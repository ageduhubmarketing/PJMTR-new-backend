"use strict";

// Models/Paper.js
var mongoose = require("mongoose");

var paperSchema = new mongoose.Schema({
  title: String,
  "abstract": String,
  keywords: String,
  researchArea: String,
  authors: [{
    salutation: String,
    firstName: String,
    middleName: String,
    lastName: String,
    designation: String,
    department: String,
    organization: String,
    email: String
  }],
  country: String,
  state: String,
  city: String,
  postalCode: String,
  address: String,
  message: String,
  file: {
    data: Buffer,
    contentType: String,
    filename: String
  },
  applicationId: {
    type: String,
    "default": function _default() {
      return Math.random().toString(36).substr(2, 9).toUpperCase();
    }
  },
  status: {
    type: String,
    "default": "Pending"
  },
  createdAt: {
    type: Date,
    "default": Date.now
  }
});
module.exports = mongoose.model("Paper", paperSchema);