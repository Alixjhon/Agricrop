export interface LocationOption {
    value: string;
    label: string;
}
export declare function getCountries(): Promise<LocationOption[]>;
export declare function getRegions(country: string): Promise<LocationOption[]>;
export declare function getCities(country: string, region: string): Promise<LocationOption[]>;
//# sourceMappingURL=locationService.d.ts.map