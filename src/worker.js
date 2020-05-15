const JSZip = require("jszip");

function convertImages(inputBuffer, callback, format, quality) {
    require("heic-convert").all({
        buffer: Buffer.from(inputBuffer),
        format, quality
    })
    .then((images) => {
        images.forEach((image, idx) => {
            image.convert()
            .then((outputBuffer) => {
                callback(outputBuffer, idx, images.length);
            });
        });
    });
}

function extractMetadata(inputBuffer, callback) {
    let metadataType;
    let metadataRaw;
    const buffer = Buffer.from(inputBuffer);
    const startIndex = buffer.indexOf("apple_desktop:");

    if (startIndex !== -1) {
        const match = buffer.slice(startIndex).toString().match(/^apple_desktop:(\w+)="(.+?)"/);

        if (match) {
            metadataType = match[1];
            metadataRaw = match[2];
        }
    }

    if (metadataType == null || metadataRaw == null) {
        throw new Error("Failed to load metadata of type 'apple_desktop' from HEIC");
    }

    require("bplist-parser").parseFile(Buffer.from(metadataRaw, "base64"))
    .then((metadataParsed) => {
        callback(metadataType, metadataParsed);
    });
}

module.exports = (self) => {
    self.addEventListener("message", (e) => {
        const zip = new JSZip();
        const fileExt = (e.data.format === "JPEG") ? "jpg" : "png";

        try {
            extractMetadata(e.data.buffer, (metadataType, metadataJson) => {
                const metadataText = JSON.stringify(metadataJson, null, 2);
                self.postMessage({ metadata: metadataText });
                zip.file(`metadata.${metadataType}.json`, metadataText);
            })
        } catch (err) {
            self.postMessage({ metadata: err.message });
        }

        try {
            convertImages(e.data.buffer, (outputBuffer, idx, maxIdx) => {
                zip.file(`image_${idx + 1}.${fileExt}`, outputBuffer);
                self.postMessage({ idx, maxIdx });

                if (idx == maxIdx - 1) {
                    zip.generateAsync({type: "blob"})
                    .then((blob) => {
                        self.postMessage({ download: blob }, null, [blob]);
                    });
                }
            }, e.data.format, e.data.quality);
        } catch (err) {
            alert("Failed to convert images: " + err.message);
        }
    });
};
