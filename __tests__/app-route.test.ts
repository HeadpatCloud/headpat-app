import { appRoute, webPath } from "@/lib/app-route";

describe("webPath", () => {
	it("accepts Headpat's own hosts", () => {
		expect(webPath("https://headpat.place/user/faye")).toBe("/user/faye");
		expect(webPath("https://www.headpat.place/gallery")).toBe("/gallery");
		expect(webPath("https://headpat.app/events/1")).toBe("/events/1");
		expect(webPath("https://headpat.app/")).toBe("/");
	});

	it("rejects anything else", () => {
		expect(webPath("https://example.com/user/faye")).toBeNull();
		expect(webPath("https://headpat.place.evil.com/user/faye")).toBeNull();
		expect(webPath("mailto:help@headpat.place")).toBeNull();
		expect(webPath("not a url")).toBeNull();
	});
});

describe("appRoute", () => {
	it("maps static pages", () => {
		expect(appRoute("/")).toBe("/");
		expect(appRoute("/gallery")).toBe("/(tabs)/gallery");
		expect(appRoute("/events")).toBe("/(tabs)/events");
		expect(appRoute("/map")).toBe("/(tabs)/locations");
		expect(appRoute("/account")).toBe("/profile-edit");
		expect(appRoute("/account/tickets")).toBe("/tickets");
		expect(appRoute("/login")).toBe("/(auth)/login");
		expect(appRoute("/profile")).toBe("/profile");
	});

	it("maps detail pages onto their app routes", () => {
		expect(appRoute("/user/faye")).toBe("/user/faye");
		expect(appRoute("/user/faye/followers")).toBe("/user/faye/followers");
		expect(appRoute("/events/abc")).toBe("/event/abc");
		expect(appRoute("/events/abc/edit")).toBe("/event/edit/abc");
		expect(appRoute("/gallery/abc")).toBe("/post/abc");
		expect(appRoute("/community/abc")).toBe("/community/abc");
		expect(appRoute("/community/abc/admin")).toBe("/community-admin/abc");
		expect(appRoute("/announcements/abc")).toBe("/announcements/abc");
		expect(appRoute("/admin/tickets/7")).toBe("/tickets/7");
	});

	it("ignores the web's locale prefix", () => {
		expect(appRoute("/de/user/faye")).toBe("/user/faye");
		expect(appRoute("/nl/gallery/abc")).toBe("/post/abc");
		expect(appRoute("/en")).toBe("/");
	});

	it("drops query and hash", () => {
		expect(appRoute("/gallery/abc?from=feed#top")).toBe("/post/abc");
	});

	it("returns null for pages the app doesn't have", () => {
		expect(appRoute("/chat/dm/1")).toBeNull();
		expect(appRoute("/pawcraft")).toBeNull();
		expect(appRoute("/legal/privacypolicy")).toBeNull();
		expect(appRoute("/community/abc/followers")).toBeNull();
		expect(appRoute("/admin/users/1")).toBeNull();
		expect(appRoute(null)).toBeNull();
	});
});
