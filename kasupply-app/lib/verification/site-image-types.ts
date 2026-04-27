export const REQUIRED_SITE_IMAGE_TYPES = ["exterior", "signage"] as const;

export type RequiredSiteImageType = (typeof REQUIRED_SITE_IMAGE_TYPES)[number];

export const SITE_IMAGE_REQUIREMENTS = [
  {
    imageType: "exterior",
    label: "Office / Warehouse Exterior",
    description: "JPG or PNG or WEBP - Max 5MB",
    accept: ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp",
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    allowedExtensions: ["jpg", "jpeg", "png", "webp"],
  },
  {
    imageType: "signage",
    label: "Business Signage",
    description: "Must show registered business name - Max 5MB",
    accept: ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp",
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    allowedExtensions: ["jpg", "jpeg", "png", "webp"],
  },
] as const;
