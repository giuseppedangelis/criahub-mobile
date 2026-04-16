import { useQuery } from "@tanstack/react-query";
import { harasSettingsService } from "@/src/services/haras-settings";

export const harasSettingsKeys = {
  all: ["haras-settings"] as const,
  location: (harasId: string) => [...harasSettingsKeys.all, "location", harasId] as const,
};

export function useHarasLocationSettingsQuery(harasId: string | null | undefined) {
  return useQuery({
    queryKey: harasSettingsKeys.location(harasId ?? ""),
    queryFn: () => harasSettingsService.getLocationSettings(harasId as string),
    enabled: Boolean(harasId),
    staleTime: 5 * 60_000,
  });
}
