// The picture types every upload accepts. Mirrors IMAGE_EXTENSIONS in backend/core/media_uploads.py, which is what actually decides;
// this only filters the file picker.
export const IMAGE_ACCEPT = '.jpg,.jpeg,.png'
export const IMAGE_OR_PDF_ACCEPT = `${IMAGE_ACCEPT},.pdf`
export const IMAGE_TYPES_TEXT = 'JPG, JPEG or PNG'
