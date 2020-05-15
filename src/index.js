const FileSaver = require("file-saver");
const webworkify = require("webworkify");

const worker = webworkify(require("./worker"));

worker.addEventListener("message", (e) => {
    if (e.data.metadata != null) {
        document.getElementById("metadata").value = e.data.metadata;
    } else if (e.data.idx != null) {
        document.getElementById("progress").value = (e.data.idx + 1) / e.data.maxIdx * 100;
        document.getElementById("message").innerHTML = `Converting image ${e.data.idx + 1} of ${e.data.maxIdx}`;
    } else if (e.data.download != null) {
        document.getElementById("uploader").disabled = false;
        document.getElementById("uploader").style.cursor = "initial";
        document.getElementById("progress").value = 0;
        document.getElementById("message").innerHTML = "Done!";
        document.getElementById("spinner").style.visibility = "hidden";
        require("file-saver").saveAs(e.data.download, "images.zip");
    }
});

document.getElementById("uploader").addEventListener("change", (e) => {
    const files = e.target.files;
    if (!files || !files.length) {
        return;
    }

    e.target.disabled = true;
    e.target.style.cursor = "not-allowed";
    document.getElementById("message").innerHTML = "Loading image, this may take a minute...";
    document.getElementById("spinner").style.visibility = "visible";
    document.getElementById("metadata").value = "";

    const reader = new FileReader();
    reader.addEventListener("loadend", () => {
        const buffer = reader.result;
        worker.postMessage({
            buffer,
            format: document.getElementById("format").value,
            quality: document.getElementById("quality").value / 100
        }, [buffer]);
    });
    reader.readAsArrayBuffer(files[0]);
});

document.getElementById("format").addEventListener("change", (e) => {
    const format = e.target.value;
    document.getElementById("quality").style.visibility = (format === "JPEG") ? "visible" : "hidden";
    document.getElementById("quality").previousElementSibling.style.visibility = (format === "JPEG") ? "visible" : "hidden";
});
