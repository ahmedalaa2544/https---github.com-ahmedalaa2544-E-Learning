import mongoose, { Schema, Types, model } from "mongoose";

const userSchmea = new Schema(
  {
    userName: {
      type: String,
      required: true,
      unique: true,
      min: 3,
      max: 20,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
      min: 8,
    },
    fullName: String,
    role: {
      type: String,
      enum: ["admin", "user"],
      default: "user",
    },
    gender: {
      type: String,
      enum: ["male", "female"],
    },
    age: {
      type: Number,
      min: 4,
      max: 100,
    },
    profilePic: {
      blobName: { type: String },
      url: { type: String },
    },
    coursesBought: {
      type: [{ type: Types.ObjectId, ref: ["Workshop", "Course"] }],
    },
    wishlist: {
      type: [{ type: Types.ObjectId, ref: "Course" }],
    },
    phone: String,
    isOnline: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    isConfirm: {
      type: Boolean,
      default: false,
    },
    forgetCode: String,
    activationCode: String,
  },
  { timestamps: true }
);

const userModel = model("User", userSchmea);
export default userModel;
