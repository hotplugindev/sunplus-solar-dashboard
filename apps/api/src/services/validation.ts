import { z } from "zod";

export const huaweiResponseSchema = z.object({
  success: z.boolean().optional(),
  data: z.array(z.object({
    code: z.string().optional(),
    stationCode: z.string().optional(),
    name: z.string().optional(),
    power: z.number().optional(),
    dayEnergy: z.number().optional(),
    collectTime: z.string().optional(),
  })).optional(),
});

export const sungrowAuthSchema = z.object({
  code: z.string().optional(),
  data: z.object({
    token: z.string().optional(),
  }).optional(),
});

export const sungrowDataSchema = z.object({
  code: z.string().optional(),
  data: z.object({
    activePower: z.number().optional(),
    dailyYield: z.number().optional(),
    batterySoc: z.number().nullable().optional(),
    gridPower: z.number().nullable().optional(),
    collectTime: z.string().optional(),
  }).optional(),
});

export const solaredgeOverviewSchema = z.object({
  overview: z.object({
    currentPower: z.object({ power: z.number() }).optional(),
    energyToday: z.object({ energy: z.number() }).optional(),
    lastUpdateTime: z.string().optional(),
  }).optional(),
});

export const solaredgeFlowSchema = z.object({
  siteCurrentPowerFlow: z.object({
    unit: z.string().optional(),
    connections: z.array(z.object({
      from: z.string(),
      to: z.string(),
      value: z.number(),
    })).optional(),
  }).optional(),
});

export const smaPlantsSchema = z.object({
  plants: z.array(z.object({
    plantId: z.string(),
    name: z.string().optional(),
  })).optional(),
});

export const smaDevicesSchema = z.object({
  devices: z.array(z.object({
    deviceId: z.string(),
    type: z.string(),
  })).optional(),
});

export const froniusTokenSchema = z.object({
  accessToken: z.string(),
  accessTokenType: z.string(),
});

export const froniusFlowSchema = z.object({
  aggregatedData: z.object({
    produced: z.number().optional(),
  }).optional(),
  currentData: z.array(z.object({
    channelTypeId: z.number(),
    value: z.number(),
  })).optional(),
});
