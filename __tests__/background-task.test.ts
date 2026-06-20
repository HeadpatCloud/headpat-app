import * as TaskManager from "expo-task-manager";
import { LOCATION_TASK } from "@/lib/location/constants";

// expo-location is touched at module load (constants.ts reads Accuracy/ActivityType).
jest.mock("expo-location", () => ({
	Accuracy: { Balanced: 3 },
	ActivityType: { Other: 1 },
	hasStartedLocationUpdatesAsync: jest.fn(),
	startLocationUpdatesAsync: jest.fn(),
	stopLocationUpdatesAsync: jest.fn(),
}));
jest.mock("expo-task-manager", () => ({ defineTask: jest.fn() }));

const mockUpdateLocation = jest.fn(async () => ({ stored: true }));
jest.mock("@/lib/location/api", () => ({
	locationApi: { updateLocation: mockUpdateLocation },
}));

// Importing the module is what must register the task — this is the crash fix:
// the task has to be defined at the global scope so a headless background launch
// (which renders no screen) still has a handler for the delivered location event.
import "@/lib/location/background-task";

const handler = (TaskManager.defineTask as jest.Mock).mock
	.calls[0]?.[1] as (a: { data: unknown; error: unknown }) => Promise<void>;

describe("background location task", () => {
	test("is registered with TaskManager at module load", () => {
		expect(TaskManager.defineTask).toHaveBeenCalledWith(
			LOCATION_TASK,
			expect.any(Function),
		);
	});

	test("posts a single fix when a location is delivered", async () => {
		mockUpdateLocation.mockClear();
		await handler({
			data: {
				locations: [
					{
						coords: {
							latitude: 1,
							longitude: 2,
							accuracy: 5,
							heading: null,
							speed: null,
						},
					},
				],
			},
			error: null,
		});
		expect(mockUpdateLocation).toHaveBeenCalledTimes(1);
		expect(mockUpdateLocation).toHaveBeenCalledWith(
			expect.objectContaining({ lat: 1, lng: 2, accuracy: 5 }),
		);
	});

	test("no-ops safely with no location, on error, and never throws", async () => {
		mockUpdateLocation.mockClear();
		await expect(
			handler({ data: undefined, error: null }),
		).resolves.toBeUndefined();
		await expect(
			handler({ data: { locations: [] }, error: null }),
		).resolves.toBeUndefined();
		await expect(
			handler({ data: {}, error: { message: "denied" } }),
		).resolves.toBeUndefined();
		expect(mockUpdateLocation).not.toHaveBeenCalled();
	});

	test("swallows a failing updateLocation (transient error)", async () => {
		mockUpdateLocation.mockClear();
		mockUpdateLocation.mockRejectedValueOnce(new Error("network"));
		await expect(
			handler({
				data: { locations: [{ coords: { latitude: 9, longitude: 9 } }] },
				error: null,
			}),
		).resolves.toBeUndefined();
	});
});
