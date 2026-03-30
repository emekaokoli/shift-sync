import { Violation } from "@shift-sync/shared";

interface UserLocation {
  locationId: string;
}

export function checkLocationCertification(
  userLocations: UserLocation[],
  shiftLocationId: string,
): Violation | null {
  const isCertified = userLocations.some(
    (ul) => ul.locationId === shiftLocationId,
  );

  if (!isCertified) {
    return {
      code: "LOCATION_NOT_ALLOWED",
      message: `Staff member is not certified to work at this location`,
      details: {
        shiftLocationId,
        certifiedLocations: userLocations.map((ul) => ul.locationId),
      },
    };
  }

  return null;
}
