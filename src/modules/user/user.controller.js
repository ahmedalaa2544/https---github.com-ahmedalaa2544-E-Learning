import userModel from "../../../DB/model/user.model.js";
import courseModel from "../../../DB/model/course.model.js";
import instructorModel from "../../../DB/model/instructor.model.js";
import { asyncHandler } from "../../utils/asyncHandling.js";
import Cryptr from "cryptr";
import tokenModel from "../../../DB/model/token.model.js";
import upload, { deleteBlob } from "../../utils/azureServices.js";
import workshopModel from "../../../DB/model/workshop.model.js";
import bcryptjs from "bcryptjs";
import { ConfirmTemp } from "../../utils/htmlTemps.js";
import crypto from "crypto";
import sendEmail from "../../utils/sentEmail.js";

export const getUser = asyncHandler(async (req, res, next) => {
  const user = await userModel.findById(req.user._id);
  const cryptr = new Cryptr(process.env.CRPTO_PHONE);
  let decryptedPhone;
  user.phone
    ? (decryptedPhone = cryptr.decrypt(user.phone))
    : (user.phone = "");
  user.phone = decryptedPhone;
  const { password, ...newUser } = user.toObject();
  return res.status(200).json({ message: "Done", newUser });
});

export const updateProfile = asyncHandler(async (req, res, next) => {
  // update profile
  if (req.body.email) {
    const checkEmail = await userModel.findOne({ email: req.body.email });
    if (checkEmail) {
      return next(new Error("email is Registred"), { cause: 400 });
    }
    const activationCode = crypto.randomBytes(64).toString("hex");
    // create user
    await userModel.findByIdAndUpdate(req.user.id, {
      activationCode,
    });
    // create confirmLink
    const link = `https://education-project.azurewebsites.net/auth/confirmEmail/${activationCode}/${req.body.email}`;
    // send email
    await sendEmail({
      to: req.body.email,
      subject: "Email Confirmation",
      html: ConfirmTemp(link),
    });
  }
  const { email, ...newBody } = req.body;
  const user = await userModel.findByIdAndUpdate(
    req.user.id,
    { ...newBody },
    { new: true }
  );
  if (req.body.phone) {
    // Encrypt phone
    const cryptr = new Cryptr(process.env.CRPTO_PHONE);
    const encryptPhone = cryptr.encrypt(req.body.phone);
    user.phone = encryptPhone;
    user.save();
  }
  if (req.body.password) {
    // Encrypt password
    const hashPassword = await bcryptjs.hash(
      req.body.password,
      +process.env.SALAT_ROUND
    );
    user.password = hashPassword;
    user.save();
  }

  // upload profile picture
  if (req.file) {
    if (req.user.profilePic) {
      // delete promotionImage from Azure cloud
      await deleteBlob(req.user.profilePic.blobName);
    }

    // Extract the extension for the promotion image.
    const blobImageExtension = req.file.originalname.split(".").pop();
    // Define the path for the promotion image in the user's course directory.
    const dateOfPublish = Date.now(); // to change the url from pic to another
    const blobImageName = `Users\\${req.user.userName}_${req.user._id}\\profilePic\\${dateOfPublish}.${blobImageExtension}`;
    // Upload image and obtain its URL.
    const imageUrl = await upload(
      req.file.path,
      blobImageName,
      "image",
      blobImageExtension
    );

    // save changes in DB
    req.user.profilePic.blobName = blobImageName;
    req.user.profilePic.url = imageUrl;
    await req.user.save();
  }

  const { password, ...newUser } = user.toObject();

  return res.status(200).json({ message: "Done", newUser });
});

export const deleteAcc = asyncHandler(async (req, res, next) => {
  await userModel.findByIdAndUpdate(req.user.id, { isDeleted: true });
  await tokenModel.updateMany({ user: req.user.id }, { valid: false });
  return res.status(200).json({ message: "Done" });
});

export const addWishlist = asyncHandler(async (req, res, next) => {
  // recieve data
  const { courseId } = req.params;
  // chcek course exists
  const course = await courseModel.findById(courseId);
  if (!course) return next(new Error("Course not found", { cause: 404 }));
  // add to wishlist
  await userModel.updateOne(
    { _id: req.user.id },
    { $addToSet: { wishlist: courseId } }
  );
  return res.status(200).json({ message: "Done" });
});

export const rmWishlist = asyncHandler(async (req, res, next) => {
  // recieve data
  const { courseId } = req.params;
  // chcek course in wishlist
  if (!req.user.wishlist.includes(courseId))
    return next(new Error("Course not exist in ur wishlist", { cause: 404 }));
  // remove
  await userModel.updateOne(
    { _id: req.user.id },
    { $pull: { wishlist: courseId } }
  );
  return res.status(200).json({ message: "Done" });
});

export const getWishlist = asyncHandler(async (req, res, next) => {
  const { wishlist } = await userModel
    .findById(req.user.id)
    .populate([{ path: "wishlist" }]);
  return res.status(200).json({ message: "Done", wishlist });
});

export const getCourses = asyncHandler(async (req, res, next) => {
  // get courses
  const courses = await userModel
    .findById(req.user.id)
    .populate([{ path: "coursesBought", model: "Course" }]);
  // get workshops
  const workshop = await userModel
    .findById(req.user.id)
    .populate([{ path: "coursesBought", model: "Workshop" }]);
  // return response
  return res.status(200).json({ message: "Done", courses, workshop });
});

export const getCreatedCourses = asyncHandler(async (req, res, next) => {
  // get courses
  const courses = await courseModel.find({ createdBy: req.user._id });
  const workshop = await workshopModel.find({ instructor: req.user._id });
  // return response
  return res.status(200).json({ message: "Done", courses, workshop });
});

export const search = asyncHandler(async (req, res, next) => {
  const query = req.query.q.toLowerCase();

  const user = await instructorModel.find();
  const userArray = user.map((user) => user.user);

  const users = await userModel
    .find({ _id: { $in: userArray } })
    .select("userName profilePic");

  let matchedData = users
    .filter((item) => item.userName.toLowerCase().includes(query))
    .slice(0, 3);

  if (query == "") {
    matchedData = "";
  }
  // respone
  return res.status(200).json({ message: "Done", matchedData });
});
