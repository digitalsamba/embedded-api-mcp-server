/**
 * Tests for AnalyticsResource class
 */

import { AnalyticsResource } from "../../src/types/analytics-resource.js";

describe("AnalyticsResource", () => {
  let mockApiClient: any;
  let analyticsResource: AnalyticsResource;

  beforeEach(() => {
    mockApiClient = {
      getTeamStatistics: jest.fn().mockResolvedValue({ data: "team stats" }),
      getRoomStatistics: jest.fn().mockResolvedValue({ data: "room stats" }),
      getSessionStatistics: jest.fn().mockResolvedValue({ data: "session stats" }),
      getParticipant: jest.fn().mockResolvedValue({ data: "participant" }),
      listParticipants: jest.fn().mockResolvedValue({ data: "participants list" }),
      getTeamCurrentStatistics: jest.fn().mockResolvedValue({ data: "current stats" }),
      getRoomLiveParticipantsData: jest.fn().mockResolvedValue({ data: "live participants data" }),
      getRoomLiveParticipantsCount: jest.fn().mockResolvedValue({ count: 5 }),
      getLiveRoomsWithParticipants: jest.fn().mockResolvedValue({ data: "live rooms with participants" }),
      getLiveRooms: jest.fn().mockResolvedValue({ data: "live rooms" }),
    };
    analyticsResource = new AnalyticsResource(mockApiClient);
  });

  describe("getTeamAnalytics", () => {
    it("should get team analytics without filters", async () => {
      const result = await analyticsResource.getTeamAnalytics();
      expect(mockApiClient.getTeamStatistics).toHaveBeenCalledWith(undefined);
      expect(result).toEqual({ data: "team stats" });
    });

    it("should get team analytics with filters", async () => {
      const filters = { startDate: "2024-01-01", endDate: "2024-01-31" };
      const result = await analyticsResource.getTeamAnalytics(filters);
      expect(mockApiClient.getTeamStatistics).toHaveBeenCalledWith(filters);
      expect(result).toEqual({ data: "team stats" });
    });
  });

  describe("getRoomAnalytics", () => {
    it("should get room analytics with just roomId", async () => {
      const result = await analyticsResource.getRoomAnalytics("room123");
      expect(mockApiClient.getRoomStatistics).toHaveBeenCalledWith("room123", undefined);
      expect(result).toEqual({ data: "room stats" });
    });

    it("should get room analytics with roomId and filters", async () => {
      const filters = { startDate: "2024-01-01", endDate: "2024-01-31" };
      const result = await analyticsResource.getRoomAnalytics("room123", filters);
      expect(mockApiClient.getRoomStatistics).toHaveBeenCalledWith("room123", filters);
      expect(result).toEqual({ data: "room stats" });
    });
  });

  describe("getSessionAnalytics", () => {
    it("should get session analytics with just sessionId", async () => {
      const result = await analyticsResource.getSessionAnalytics("session123");
      expect(mockApiClient.getSessionStatistics).toHaveBeenCalledWith("session123", undefined);
      expect(result).toEqual({ data: "session stats" });
    });

    it("should get session analytics with sessionId and filters", async () => {
      const filters = { metrics: ["duration", "participants"] };
      const result = await analyticsResource.getSessionAnalytics("session123", filters);
      expect(mockApiClient.getSessionStatistics).toHaveBeenCalledWith("session123", filters);
      expect(result).toEqual({ data: "session stats" });
    });
  });

  describe("getParticipantAnalytics", () => {
    it("should get specific participant analytics when participantId is provided", async () => {
      const result = await analyticsResource.getParticipantAnalytics("participant123");
      expect(mockApiClient.getParticipant).toHaveBeenCalledWith("participant123");
      expect(mockApiClient.listParticipants).not.toHaveBeenCalled();
      expect(result).toEqual({ data: "participant" });
    });

    it("should list all participants when no participantId is provided", async () => {
      const result = await analyticsResource.getParticipantAnalytics();
      expect(mockApiClient.listParticipants).toHaveBeenCalled();
      expect(mockApiClient.getParticipant).not.toHaveBeenCalled();
      expect(result).toEqual({ data: "participants list" });
    });
  });

  describe("getUsageAnalytics", () => {
    it("should get usage analytics without filters", async () => {
      const result = await analyticsResource.getUsageAnalytics();
      expect(mockApiClient.getTeamStatistics).toHaveBeenCalledWith(undefined);
      expect(result).toEqual({ data: "team stats" });
    });

    it("should get current usage analytics when current flag is true", async () => {
      const filters = { current: true, metrics: ["sessions", "participants"] };
      const result = await analyticsResource.getUsageAnalytics(filters);
      expect(mockApiClient.getTeamCurrentStatistics).toHaveBeenCalledWith(["sessions", "participants"]);
      expect(mockApiClient.getTeamStatistics).not.toHaveBeenCalled();
      expect(result).toEqual({ data: "current stats" });
    });

    it("should get historical usage analytics with filters", async () => {
      const filters = { startDate: "2024-01-01", endDate: "2024-01-31" };
      const result = await analyticsResource.getUsageAnalytics(filters);
      expect(mockApiClient.getTeamStatistics).toHaveBeenCalledWith(filters);
      expect(result).toEqual({ data: "team stats" });
    });
  });

  describe("getLiveAnalytics", () => {
    it("should get all live rooms without participants when no parameters", async () => {
      const result = await analyticsResource.getLiveAnalytics();
      expect(mockApiClient.getLiveRooms).toHaveBeenCalled();
      expect(result).toEqual({ data: "live rooms" });
    });

    it("should get all live rooms with participants when includeParticipants is true", async () => {
      const result = await analyticsResource.getLiveAnalytics(undefined, true);
      expect(mockApiClient.getLiveRoomsWithParticipants).toHaveBeenCalled();
      expect(result).toEqual({ data: "live rooms with participants" });
    });

    it("should get specific room live participant count", async () => {
      const result = await analyticsResource.getLiveAnalytics("room123", false);
      expect(mockApiClient.getRoomLiveParticipantsCount).toHaveBeenCalledWith("room123");
      expect(result).toEqual({ count: 5 });
    });

    it("should get specific room live participant data", async () => {
      const result = await analyticsResource.getLiveAnalytics("room123", true);
      expect(mockApiClient.getRoomLiveParticipantsData).toHaveBeenCalledWith("room123");
      expect(result).toEqual({ data: "live participants data" });
    });
  });
});