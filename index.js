/**
The MIT License
Copyright (c) 2023 apple502j

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

const fileEl = document.getElementById("file");
const resultEl = document.getElementById("result");

const outputUnknown = (file) => {
  const e = document.createElement("strong");
  e.textContent = file.name;
  const text = document.createElement("p");
  text.append(document.createTextNode("File "));
  text.append(e);
  text.append(document.createTextNode(" does not look like a Fabric mod."));
  resultEl.prepend(text);
};

const outputUndetected = (file) => {
  const e = document.createElement("strong");
  e.textContent = file.name;
  const text = document.createElement("p");
  text.append(document.createTextNode("File "));
  text.append(e);
  text.append(
    document.createTextNode(
      " does not seem to have the malicious code. This may be incorrect, always check yourself!"
    )
  );
  resultEl.prepend(text);
};

const outputDetected = (file) => {
  const e = document.createElement("strong");
  e.textContent = file.name;
  const text = document.createElement("p");
  text.append(document.createTextNode("File "));
  text.append(e);
  text.append(document.createElement("is"));
  const e2 = document.createElement("strong");
  e2.textContent = " is LIKELY INFECTED!";
  text.append(e2);
  resultEl.prepend(text);
};

const check = async (file) => {
  let zip;
  try {
    zip = await JSZip.loadAsync(file);
  } catch {
    console.log("Received a non-zip file", file.name);
    outputUnknown(file);
    return;
  }
  if (
    !["fabric.mod.json", "quilt.mod.json", "mods.toml"].some((fn) =>
      zip.file(fn)
    )
  ) {
    console.log("Received a bogus file", file.name);
    outputUnknown(file);
    return;
  }
  const promises = [];
  for (const obj of zip.file(/^(?!assets|data|META-INF)[a-z]+\/.+\.class$/)) {
    if (obj.dir) return;
    promises.push(
      obj.async("binarystring").then(
        (str) =>
          str.includes("<clinit>") && // clinit, that's normal
          str.includes("java/lang/Class") && // eh, somewhat normal?
          str.includes("java/lang/reflect/Constructor") && // ???
          str.includes("Ljava/lang/String;ZLjava/lang/ClassLoader") // why are you invoking this???
      )
    );
  }
  const res = await Promise.all(promises);
  if (res.some(Boolean)) {
    outputDetected(file);
  } else {
    outputUndetected(file);
  }
};

fileEl.addEventListener("change", () => {
  for (const file of fileEl.files) {
    check(file);
  }
});
