jest.mock("expo-age-range", () => ({ requestAgeRangeAsync: jest.fn() }));

import { requestAgeRangeAsync } from "expo-age-range";
import { Platform } from "react-native";
import { checkAgeSignal, mapAgeResponse } from "@/lib/age-range";

describe("mapAgeResponse", () => {
	it("is adult when the lower bound is 18 or more", () => {
		expect(mapAgeResponse({ lowerBound: 18, upperBound: null })).toBe("adult");
		expect(mapAgeResponse({ lowerBound: 21, upperBound: null })).toBe("adult");
	});

	it("is minor when the upper bound is under 18", () => {
		expect(mapAgeResponse({ lowerBound: null, upperBound: 17 })).toBe("minor");
		expect(mapAgeResponse({ lowerBound: 13, upperBound: 17 })).toBe("minor");
	});

	it("is unavailable when bounds are null or straddle 18", () => {
		expect(mapAgeResponse({ lowerBound: null, upperBound: null })).toBe(
			"unavailable",
		);
		expect(mapAgeResponse({ lowerBound: 16, upperBound: 20 })).toBe(
			"unavailable",
		);
	});
});

describe("checkAgeSignal", () => {
	beforeEach(() => {
		(requestAgeRangeAsync as jest.Mock).mockReset();
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	function setPlatform(os: string, version: string | number) {
		Object.defineProperty(Platform, "OS", {
			configurable: true,
			value: os,
		});
		Object.defineProperty(Platform, "Version", {
			configurable: true,
			value: version,
		});
	}

	it("Android: returns adult when API returns adult bounds", async () => {
		setPlatform("android", 34);
		(requestAgeRangeAsync as jest.Mock).mockResolvedValue({
			lowerBound: 18,
			upperBound: null,
		});
		await expect(checkAgeSignal()).resolves.toBe("adult");
	});

	it("Android: returns minor when API returns minor bounds", async () => {
		setPlatform("android", 34);
		(requestAgeRangeAsync as jest.Mock).mockResolvedValue({
			lowerBound: null,
			upperBound: 17,
		});
		await expect(checkAgeSignal()).resolves.toBe("minor");
	});

	it("Android: returns unavailable when API rejects", async () => {
		setPlatform("android", 34);
		(requestAgeRangeAsync as jest.Mock).mockRejectedValue(
			new Error("ERR_AGE_RANGE_USER_DECLINED"),
		);
		await expect(checkAgeSignal()).resolves.toBe("unavailable");
	});

	it("iOS 26: returns adult when API returns adult bounds", async () => {
		setPlatform("ios", "26.0");
		(requestAgeRangeAsync as jest.Mock).mockResolvedValue({
			lowerBound: 18,
			upperBound: null,
		});
		await expect(checkAgeSignal()).resolves.toBe("adult");
	});

	it("iOS 18 (older): short-circuits to unavailable without calling the API", async () => {
		setPlatform("ios", "18.0");
		await expect(checkAgeSignal()).resolves.toBe("unavailable");
		expect(requestAgeRangeAsync).not.toHaveBeenCalled();
	});
});
