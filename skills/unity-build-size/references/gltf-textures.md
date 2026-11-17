# glTF textures in a Unity build (glTFast)

Read this when `scripts/check_unity_build_size.py` reports `gltf-embedded-texture`,
`gltf-embedded-images`, or `gltf-heavy-geometry`, or when the Build Report lists `.glb`/`.gltf`
files near the top. Checked against **glTFast 6.20.0** (`com.unity.cloud.gltfast`) on
**Unity 6000.5.10f1** and **glTF Transform CLI 4.5.1**. The behavior comes from the package, so
read its version in `Packages/packages-lock.json` first.

Contents: why embedded images are heavy · Fix A (shrink inside the model) · Fix B (pull images
out) · heavy geometry.

## Why embedded images are heavy

glTFast imports a `.glb`/`.gltf` with a `ScriptedImporter`. How each image arrives decides how
it's shipped:

| Image in the model | How glTFast 6.20 loads it in the Editor | What ships |
|---|---|---|
| Inside the file (a `bufferView` in a `.glb`, or a `data:` URI) | Decoded with `Texture2D.LoadImage`, then added to the model as a sub-asset | Uncompressed: the PNG becomes RGBA 32-bit, the JPEG becomes RGB24, with mipmaps (importer default) |
| A separate file next to a `.gltf` (`"uri": "wood.png"`) already in `Assets/` | `AssetDatabase.LoadAssetAtPath<Texture2D>` on that file | Whatever its Texture Importer says: compressed by default |

Sources in the package: `Runtime/Scripts/ImageConversionImageLoader.cs` (the `LoadImage` call),
`Editor/Scripts/EditorDownloadProvider.cs` (external images come from the asset database),
`Editor/Scripts/GltfImporter.cs` (only textures with no asset path become sub-assets; mipmaps
enabled by default). The importer has no compression or max-size setting for embedded images.

Measured with a 512×512 JPEG on Windows Standalone: embedded in the `.glb` it was `RGB24`;
moved next to a `.gltf` it was `DXT1`. Mipmaps add a third, so an uncompressed texture costs
`width × height × bytes-per-pixel × 4/3`:

| Side | RGB24 (JPEG) | RGBA32 (PNG) |
|---|---|---|
| 512 | 1.0 MB | 1.3 MB |
| 1024 | 4.0 MB | 5.3 MB |
| 2048 | 16.0 MB | 21.3 MB |
| 4096 | 64.0 MB | 85.3 MB |
| 8192 | 256.0 MB | 341.3 MB |

(The MB here is in 1024²-byte units.) A model with three 8K maps costs nearly 1 GB before
anything else.

## Fix A: shrink images inside the model (minimal change)

[glTF Transform](https://gltf-transform.dev/cli), via its `resize` command, shrinks PNG and
JPEG textures, keeps the aspect ratio, and never upscales. Commit or back up first: with the
same input and output path, it overwrites the model. Requires Node.js.

```bash
# One model, every texture at most 1024 px on its longest side
npx @gltf-transform/cli@4 resize model.glb model.glb --width 1024 --height 1024
```

Every `.glb` in a project, from the project root (bash; in PowerShell loop over
`Get-ChildItem Assets -Recurse -Filter *.glb`):

```bash
find Assets -iname '*.glb' -not -path 'Assets/StreamingAssets/*' -print0 |
  while IFS= read -r -d '' f; do
    npx @gltf-transform/cli@4 resize "$f" "$f" --width 1024 --height 1024
  done
```

Textures still ship uncompressed, so pick the side from the table. Unity reimports models on
the Editor's next focus, or at the start of a batch-mode run.

- `resize --pattern` only matches images by name or URI. Embedded images in an exported `.glb`
  often have neither, so nothing matches and nothing signals an error. Rerun the checker rather
  than assume it worked.
- **A `.gltf` entry becomes a Fix B.** When `resize` writes a `.gltf`, it writes every image,
  including `data:` URIs, as a separate file next to it, named after the texture slot
  (`baseColor_1.png`, `normal_1.png`, ...), and it overwrites files with those names. Two
  `.gltf` files in the same folder then end up pointing at the same images — the last model's.
  Move each `.gltf` with its `.meta` into its own folder first (the checker shows the path),
  then follow Fix B's sRGB step. Only a `.glb` keeps its embedded images after Fix A.

## Fix B: pull images out so the Texture Importer compresses them

`gltf-transform copy` writes a `.gltf` with its buffer and images as separate files. Give it
its own folder, for the naming reason above:

```bash
npx @gltf-transform/cli@4 copy model.glb Assets/Models/Model/model.gltf
```

The `.gltf` gets a new GUID, so every prefab or scene referencing the `.glb` must be
repointed. Delete the old `.glb` and its `.meta` only after the new model works in every scene
that used it.

Each image is now its own texture asset with Unity's default import settings: compressed, Max
Size 2048, and **sRGB (Color Texture) enabled**. That color setting is wrong for data
textures. glTFast only treats these as sRGB (`GltfImport.cs`, the texture gamma pass):

- `baseColorTexture`, `emissiveTexture`;
- with `KHR_materials_pbrSpecularGlossiness`: `diffuseTexture` and
  `specularGlossinessTexture`.

Disable **sRGB (Color Texture)** on every other texture the model uses: normal,
metallic-roughness, occlusion, and any extension data map. In verification, normal maps
arrived as `Default` with sRGB enabled, which shades wrong in a project using the Linear color
space. glTFast samples the embedded versions as plain linear textures, so Texture Type
`Default` with sRGB disabled matches what the embedded import did. Compare the model against
the original embedded one in the same scene and lighting before deleting the `.glb`.

Fix B gives real block compression (several times smaller than Fix A at the same resolution)
and per-platform overrides, at the cost of more files and the color-space step.

## Heavy geometry

`gltf-heavy-geometry` means the model's buffers contain more than images. glTFast turns that
data into Unity meshes of roughly equivalent size, and the Model Importer's **Mesh
Compression** doesn't apply since glTFast isn't the Model Importer. Reduce the source. `weld`
first, because separate vertices stop the simplifier too early, and loosen `--error` (the
default 0.0001 often stops well short of the intended ratio):

```bash
npx @gltf-transform/cli@4 weld model.glb model.glb
npx @gltf-transform/cli@4 simplify model.glb model.glb --ratio 0.5 --error 0.001
```

Check the silhouette in the scene and keep the original in version control.
