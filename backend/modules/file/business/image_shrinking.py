import io

from PIL import Image, ImageOps, UnidentifiedImageError
from pillow_heif import register_heif_opener

from core.exceptions import RefusedError


MAX_SIDE_IN_PIXELS = 1600

JPEG_QUALITY = 82

LIGHT_ENOUGH_IN_BYTES = 600 * 1024

MAX_PIXELS = 80_000_000

DISPLAYABLE_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}

register_heif_opener()


def shrink_image(content_type: str, content: bytes) -> tuple[str, bytes]:
    """
    Make a photo light enough to keep and readable by every browser: upright, 1600 px on its longest side, JPEG. A light image browsers already read is kept as it is.

    Args:
        content_type (str): Type the front gave.
        content (bytes): Image bytes.

    Returns:
        tuple[str, bytes]: Type and bytes to store.

    Raises:
        RefusedError: document_invalid for bytes that are not a readable image, or one too large to open.
    """
    try:
        with Image.open(io.BytesIO(content)) as image:
            if image.width * image.height > MAX_PIXELS:
                raise RefusedError("document_invalid", 422)
            is_light = len(content) <= LIGHT_ENOUGH_IN_BYTES and max(image.size) <= MAX_SIDE_IN_PIXELS
            if content_type in DISPLAYABLE_CONTENT_TYPES and is_light:
                image.verify()
                return content_type, content
            upright = ImageOps.exif_transpose(image)
            upright.thumbnail((MAX_SIDE_IN_PIXELS, MAX_SIDE_IN_PIXELS))
            output = io.BytesIO()
            flatten(upright).save(output, "JPEG", quality=JPEG_QUALITY, optimize=True)
    except (UnidentifiedImageError, OSError, SyntaxError, ValueError, Image.DecompressionBombError) as error:
        raise RefusedError("document_invalid", 422) from error
    return "image/jpeg", output.getvalue()


def flatten(image: Image.Image) -> Image.Image:
    """
    Put an image on white, since JPEG has no transparency.

    Args:
        image (Image.Image): Image, transparent or not.

    Returns:
        Image.Image: The image in RGB.
    """
    if image.mode not in ("RGBA", "LA", "P"):
        return image.convert("RGB")
    transparent = image.convert("RGBA")
    background = Image.new("RGB", transparent.size, "white")
    background.paste(transparent, mask=transparent.getchannel("A"))
    return background
