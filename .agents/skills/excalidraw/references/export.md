# Export to PNG/SVG

Export `.excalidraw` files to PNG and/or SVG using an available browser or local
renderer. The Playwright examples below are an optional legacy recipe, not a
requirement or a verified renderer for every environment. Check the installed
renderer version and its primary documentation before relying on its API.

## Prerequisites

- Browser automation with page execution, or an existing local renderer. Discover
  tools first and use their documented APIs; do not assume Playwright tool names
  exist. With computer-use tools, read their skill before operating the browser.
- Python 3 installed when using the local HTTP server example.
- If no renderer is available, return the editable JSON and state that image
  export remains unverified; do not install tooling just to satisfy this recipe.

## Procedure

### 1. Start a Local HTTP Server

A browser origin is required for dynamic ESM imports. Start a temporary server on any available port:

```powershell
$diagramServer = Start-Process python -ArgumentList @('-m', 'http.server', '8765', '--bind', '127.0.0.1') -WorkingDirectory (Get-Location).Path -PassThru -WindowStyle Hidden
```

### 2. Navigate Playwright to the Server

```
browser_navigate → http://localhost:8765/
```

Navigate to the directory URL. Direct navigation to an `.excalidraw` file may
download it; fetch its encoded relative path from the page when needed.

### 3. Read the .excalidraw File

Use the Read tool to get the `.excalidraw` file contents as a string. This JSON string will be passed into the browser context in the next steps.

### 4. Export SVG

Use `browser_run_code` with the following pattern. Replace `EXCALIDRAW_JSON_HERE` with the actual JSON string from Step 3:

```javascript
async (page) => {
  const excalidrawJson = `EXCALIDRAW_JSON_HERE`;

  const svgString = await page.evaluate(async (json) => {
    const utils = await import('https://esm.sh/@excalidraw/utils@0.1.2');
    const { exportToSvg } = utils.default;
    const data = JSON.parse(json);
    const svg = await exportToSvg({
      elements: data.elements,
      appState: { ...data.appState, exportBackground: true },
      files: data.files || {}
    });
    return svg.outerHTML;
  }, excalidrawJson);

  return svgString;
}
```

Write the returned SVG string directly to `<filename>.svg` using the Write tool.

### 5. Export PNG

Use `browser_run_code` with the following pattern:

```javascript
async (page) => {
  const excalidrawJson = `EXCALIDRAW_JSON_HERE`;

  const pngBase64 = await page.evaluate(async (json) => {
    const utils = await import('https://esm.sh/@excalidraw/utils@0.1.2');
    const { exportToBlob } = utils.default;
    const data = JSON.parse(json);
    const blob = await exportToBlob({
      elements: data.elements,
      appState: { ...data.appState, exportBackground: true },
      files: data.files || {},
      mimeType: 'image/png'
    });
    const reader = new FileReader();
    return new Promise((resolve) => {
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  }, excalidrawJson);

  return pngBase64;
}
```

The result is a base64 data URL. Decode and write to `<filename>.png`:

```powershell
[IO.File]::WriteAllBytes((Join-Path (Get-Location) '<filename>.png'), [Convert]::FromBase64String('<base64_data_without_prefix>'))
```

Strip the `data:image/png;base64,` prefix before decoding.

### 6. Clean Up

Close the browser and kill the HTTP server:

```
browser_close
```

```powershell
Stop-Process -Id $diagramServer.Id
```

## Key Details

- **Import path**: Export functions are on `utils.default`, not named exports — this is how `esm.sh` wraps the `@excalidraw/utils` package
- **Console errors**: Invalid text coordinates or missing labels fail visual
  validation. Normalize elements using the renderer's supported restore API and
  inspect the rendered output before reporting success.
- **Background**: `exportBackground: true` includes the white background in exports
- **Output location**: Save exported files alongside the `.excalidraw` file with matching filename (e.g., `system-architecture.excalidraw` → `system-architecture.svg`, `system-architecture.png`)
- **Visual fidelity**: Open and inspect exports for readable labels, intact arrows,
  nonempty content, and clipping before claiming fidelity.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Port already in use | Choose another port and update the server arguments and browser URL |
| Dynamic import fails | Check network connectivity; `esm.sh` CDN must be reachable |
| Playwright tools not available | Use available browser automation or an existing local renderer; otherwise report the export limitation |
| PNG is blank/corrupted | Verify the base64 prefix was stripped before decoding |
| SVG missing text | Treat as a rendering failure; check text bindings and finite coordinates, then render and inspect again |
