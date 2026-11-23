import { formatVoiceDuration, resampleWaveform } from "@/lib/voice";

describe("formatVoiceDuration", () => {
	it("prints minutes and padded seconds", () => {
		expect(formatVoiceDuration(0)).toBe("0:00");
		expect(formatVoiceDuration(7400)).toBe("0:07");
		expect(formatVoiceDuration(83_000)).toBe("1:23");
		expect(formatVoiceDuration(300_000)).toBe("5:00");
		expect(formatVoiceDuration(-5)).toBe("0:00");
	});
});

describe("resampleWaveform", () => {
	it("squashes by peak and stretches by repeating", () => {
		expect(resampleWaveform([10, 90, 20, 40], 2)).toEqual([90, 40]);
		expect(resampleWaveform([10, 90], 4)).toEqual([10, 10, 90, 90]);
		expect(resampleWaveform([], 3)).toEqual([0, 0, 0]);
		expect(resampleWaveform([5], 0)).toEqual([]);
	});
});
