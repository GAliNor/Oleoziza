import io

import pytest
from PIL import Image

from core.exceptions import RefusedError
from modules.file.business.image_shrinking import shrink_image


def build_image(size: tuple[int, int], image_format: str, mode: str = "RGB", **options: object) -> bytes:
    """
    Draw a noisy picture, which compresses as badly as a real photo.

    Args:
        size (tuple[int, int]): Width and height.
        image_format (str): Pillow format.
        mode (str): Pixel mode.
        **options (object): Options of the format.

    Returns:
        bytes: The encoded picture.
    """
    noise = Image.effect_noise(size, 60).convert(mode)
    output = io.BytesIO()
    noise.save(output, image_format, **options)
    return output.getvalue()


def test_an_iphone_heic_becomes_a_jpeg_browsers_read() -> None:
    """
    Q11: a HEIC the phone could not convert is converted, at most 1600 px on its longest side.
    """
    content_type, content = shrink_image("image/heic", build_image((2400, 1800), "HEIF"))

    assert (content_type, Image.open(io.BytesIO(content)).size) == ("image/jpeg", (1600, 1200))


def test_a_twelve_megapixel_photo_is_made_light() -> None:
    """
    Q11: a photo straight from a phone is stored at 1600 px, far lighter.
    """
    original = build_image((4032, 3024), "JPEG", quality=95)

    _, content = shrink_image("image/jpeg", original)

    assert max(Image.open(io.BytesIO(content)).size) == 1600
    assert len(content) < len(original) / 5


def test_a_photo_taken_sideways_is_stored_upright() -> None:
    """
    The phone's orientation tag is applied before it is lost.
    """
    exif = Image.Exif()
    exif[0x0112] = 6

    _, content = shrink_image("image/jpeg", build_image((2000, 1000), "JPEG", exif=exif))

    assert Image.open(io.BytesIO(content)).size == (800, 1600)


def test_a_light_image_is_kept_as_it_is() -> None:
    """
    What the device already shrank is not compressed twice.
    """
    original = build_image((200, 100), "JPEG")

    assert shrink_image("image/jpeg", original) == ("image/jpeg", original)


def test_a_transparent_screenshot_is_put_on_white() -> None:
    """
    JPEG has no transparency: a transparent picture must not turn black.
    """
    output = io.BytesIO()
    Image.new("RGBA", (2000, 2000), (0, 0, 0, 0)).save(output, "PNG")

    _, content = shrink_image("image/png", output.getvalue())

    assert Image.open(io.BytesIO(content)).getpixel((10, 10)) == (255, 255, 255)


@pytest.mark.parametrize("content", [b"not an image", b"\xff\xd8\xff\xe0 cut short"])
def test_what_is_not_an_image_is_refused(content: bytes) -> None:
    """
    A file nobody can read is refused with its code.
    """
    with pytest.raises(RefusedError) as refusal:
        shrink_image("image/jpeg", content)

    assert refusal.value.code == "document_invalid"
