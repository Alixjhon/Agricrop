"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCityOptions = exports.getRegionOptions = exports.getCountryOptions = void 0;
const zod_1 = require("zod");
const locationService_1 = require("../services/locationService");
const regionsQuerySchema = zod_1.z.object({
    countryCode: zod_1.z.string().min(1),
});
const citiesQuerySchema = zod_1.z.object({
    countryCode: zod_1.z.string().min(1),
    regionCode: zod_1.z.string().min(1),
});
const getCountryOptions = async (_req, res) => {
    try {
        const countries = await (0, locationService_1.getCountries)();
        res.json({ countries });
    }
    catch (error) {
        console.error('Error fetching countries:', error);
        res.status(500).json({ error: 'Failed to fetch countries' });
    }
};
exports.getCountryOptions = getCountryOptions;
const getRegionOptions = async (req, res) => {
    try {
        const { countryCode } = regionsQuerySchema.parse(req.query);
        const regions = await (0, locationService_1.getRegions)(countryCode);
        res.json({ regions });
    }
    catch (error) {
        console.error('Error fetching regions:', error);
        res.status(500).json({ error: 'Failed to fetch regions' });
    }
};
exports.getRegionOptions = getRegionOptions;
const getCityOptions = async (req, res) => {
    try {
        const { countryCode, regionCode } = citiesQuerySchema.parse(req.query);
        const cities = await (0, locationService_1.getCities)(countryCode, regionCode);
        res.json({ cities });
    }
    catch (error) {
        console.error('Error fetching cities:', error);
        res.status(500).json({ error: 'Failed to fetch cities' });
    }
};
exports.getCityOptions = getCityOptions;
//# sourceMappingURL=locationController.js.map