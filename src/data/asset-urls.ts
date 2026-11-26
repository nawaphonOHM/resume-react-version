import type { AvailabilityStatus } from "../status";

export const IMAGE_ASSET_ORIGIN = "https://ohm-mho.space";

export const assetUrls = {
  file(fileName: string): string {
    return `${IMAGE_ASSET_ORIGIN}/assets/${encodeURIComponent(fileName)}`;
  },
  favicon(status: AvailabilityStatus): string {
    const query = encodeURIComponent(JSON.stringify({ status }));
    return `${IMAGE_ASSET_ORIGIN}/assets/favicon.svg?${query}`;
  },
};
