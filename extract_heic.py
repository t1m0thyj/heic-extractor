"""
Requires Wand and ImageMagick
See http://docs.wand-py.org/en/latest/guide/install.html

Usage: extract_heic.py <inputHeic> <outputDir>
Example: extract_heic.py "input/Mojave Desert.heic" "output/Mojave_Desert"

Explanation of how to read the XML metadata:
apple_desktop:solar - https://itnext.io/macos-mojave-dynamic-wallpapers-ii-f8b1e55c82f
apple_desktop:h24 - https://github.com/mczachurski/wallpapper/issues/36
"""

import base64
import os
import plistlib
import re
import sys
from multiprocessing import Pool

from wand.image import Image  # pip install Wand

in_heic = sys.argv[1]
out_dir = sys.argv[2]


def process_image(i):
    with Image(filename=f"{in_heic}[{i}]") as img:
        img.compression_quality = 98
        img.format = "jpeg"
        theme_id = os.path.basename(out_dir).replace(' ', '_')

        if img.width / img.height != 16 / 9:
            img.save(filename=f"{out_dir}/{theme_id}_Square_{i + 1}.jpg")
            new_height = img.width * 9 // 16
            img.crop(0, (img.height - new_height) // 2, width=img.width, height=new_height)

        img.save(filename=f"{out_dir}/{theme_id}_{i + 1}.jpg")

    print('.', end="", flush=True)


if __name__ == "__main__":
    if not os.path.isdir(out_dir):
        os.mkdir(out_dir)

    metadata_type = None
    with open(in_heic, "rb") as fileobj:
        for line in fileobj:
            start_index = line.find(b"apple_desktop:")

            if start_index != -1:
                match = re.match(r"apple_desktop:(\w+)=\"(.+?)\"", line[start_index:].decode("latin1"))
                metadata_type = match.group(1)
                metadata_b64 = match.group(2)
                break

    if metadata_type is not None:
        metadata_plist = plistlib.loads(base64.b64decode(metadata_b64), fmt=plistlib.FMT_BINARY)
        metadata_xml = plistlib.dumps(metadata_plist, fmt=plistlib.FMT_XML)

        with open(f"{out_dir}/metadata.{metadata_type}.xml", "wb") as fileobj:
            fileobj.write(metadata_xml)

        print(f"Saved metadata of type apple_desktop:{metadata_type} to XML file")

        num_frames = 0
        while metadata_xml.count(b"<integer>%d</integer>" % num_frames):
            num_frames += 1
    else:
        num_frames = 1

    print(f"Extracting {num_frames} frame(s) from HEIC", end="", flush=True)

    try:
        pool = Pool()
        pool.map(process_image, range(num_frames))
    finally:
        pool.close()
        pool.join()

    print("done!")
