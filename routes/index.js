const express = require("express");
// import api from './api/index.js'
const user = require("./api/user");
const profile = require("./api/profile");
const news = require("./api/news");
const newsType = require("./api/news-type");
const annouce = require("./api/annouce");
const banner = require("./api/banner");
const video = require("./api/video");
const about = require("./api/about");
const contact = require("./api/contact");
const direction = require("./api/direction");
const department = require("./api/department");
const team = require("./api/team");
const froala = require("./api/froala");
const newsGallery = require("./api/news-gallery");
const sdg = require("./api/sdg");
const sdgType = require("./api/sdg-type");
const equipmentDepartment = require("./api/equipment-department");
const equipmentGallery = require("./api/equipment-gallery");
const equipment = require("./api/equipment");
const equipmentMethod = require("./api/equipment-method");
const booking = require("./api/booking");
const report = require("./api/report");
const serviceCategory = require("./api/service-category");
const serve = require("./api/serve");
const cwie = require("./api/cwie");
const course = require("./api/course");
const intellectual = require("./api/intellectual");
const article = require("./api/article");
const department_team = require("./api/department-team");

const router = express.Router();

router.use(
    `/api/v${process.env.API_VERSION}`,
    router.use("/user", user),
    router.use("/profile", profile),
    router.use("/news", news),
    router.use("/news-type", newsType),
    router.use("/annouce", annouce),
    router.use("/banner", banner),
    router.use("/video", video),
    router.use("/about", about),
    router.use("/contact", contact),
    router.use("/direction", direction),
    router.use("/department", department),
    router.use("/team", team),
    router.use("/froala", froala),
    router.use("/news-gallery", newsGallery),
    router.use("/sdg", sdg),
    router.use("/sdg-type", sdgType),
    router.use("/equipment-department", equipmentDepartment),
    router.use("/equipment-gallery", equipmentGallery),
    router.use("/equipment", equipment),
    router.use("/equipment-method", equipmentMethod),
    router.use("/booking", booking),
    router.use("/report", report),
    router.use("/service-category", serviceCategory),
    router.use("/serve", serve),
    router.use("/cwie", cwie),
    router.use("/course", course),
    router.use("/intellectual", intellectual),
    router.use("/article", article),
    router.use("/department-team", department_team)
);

module.exports = router;
