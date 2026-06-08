"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.locationRoutes = void 0;
const express_1 = __importDefault(require("express"));
const locationController_1 = require("../controllers/locationController");
const router = express_1.default.Router();
exports.locationRoutes = router;
router.get('/locations/countries', locationController_1.getCountryOptions);
router.get('/locations/regions', locationController_1.getRegionOptions);
router.get('/locations/cities', locationController_1.getCityOptions);
//# sourceMappingURL=locationRoutes.js.map