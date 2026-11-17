# Android (APK, AAB, Google Play)

Read this when the target is an Android device or store. Pass `--platform Android` to the
checker. Checked against the Unity 6000.3 manual and the Play Console help (2026-11).

## What's limited

Google Play measures the **compressed download size** it calculates from the AAB, not the
`.aab` file itself. Its current limits
([Play Console help](https://support.google.com/googleplay/android-developer/answer/9859372)):

| Part | Limit |
|---|---|
| Base module | 500 MB |
| One asset pack | 1.5 GB |
| Base, feature modules, and install-time asset packs combined | 4 GB |
| Fast-follow and on-demand asset packs combined | 30 GB |
| An app still uploaded as APK | 100 MB per APK |

Above 200 MB, Play warns users on mobile data before installing. The Unity 6000.3 manual still
gives the old 200 MB base-module limit
([Google Play distribution requirements](https://docs.unity3d.com/6000.3/Documentation/Manual/android-distribution-google-play.html)),
so treat 200 MB as the comfortable target and 500 MB as the hard limit. Other stores set their
own limits; ask which store when the user hasn't said.

For an APK limit, the `.apk` file's size is the number (`ls -l`). For Play, measure what it
will serve with [bundletool](https://developer.android.com/tools/bundletool):

```bash
bundletool build-apks --bundle=MyGame.aab --output=MyGame.apks
bundletool get-size total --apks=MyGame.apks
```

## First moves, in order

1. **Target Architectures: ARM64 only**, unless the user must support 32-bit devices. Each
   extra architecture adds another copy of IL2CPP and the engine's native libraries. With an
   AAB, Play only serves each device its own architecture, so ARMv7 grows the upload more than
   the download. With APKs, enable **Split APKs by target architecture**
   ([Android Player settings](https://docs.unity3d.com/6000.3/Documentation/Manual/class-PlayerSettingsAndroid.html)).
2. **Textures**: run the main workflow with `--platform Android`. ASTC is the preferred format
   on current devices; a larger block size costs fewer bits per pixel (each ASTC block is 128
   bits, so 4x4 is 8 bpp, 6x6 about 3.6 bpp, and 8x8 2 bpp). Only shrink block size where
   artifacts appear. Listing several Texture Compression Formats in Player Settings makes the
   AAB carry each one and lets Play serve one per device
   ([textureCompressionFormats](https://docs.unity.com/en-us/engine/6000.3/script-reference/unityeditor/playersettings/android/texturecompressionformats)).
3. **Above the base module limit: Split Application Binary** (Publishing Settings), so the AAB
   gets a base module plus an install-time asset pack. Large optional content goes into custom
   fast-follow or on-demand asset packs
   ([Play Asset Delivery](https://docs.unity3d.com/6000.3/Documentation/Manual/play-asset-delivery.html),
   [Optimize distribution size](https://docs.unity3d.com/6000.3/Documentation/Manual/android-optimize-distribution-size.html)).
4. **Compression Method: leave on Default.** On Android the default is ZIP, which compresses
   slightly better than LZ4HC
   ([Compression Method row](https://docs.unity.com/en-us/engine/6000.3/manual/platform-specific/windows/standalone-binaries)).
5. **Minify** (Publishing Settings → Minify → Release) shrinks Java/Kotlin code, usually by
   only a few MB. R8 can remove classes that plugins (ads, IAP, analytics) reach via
   reflection, and it only shows up as a runtime crash, so only enable it with the plugins'
   keep rules in place, and test on a device.
6. **Debug symbols**: symbols bundled into the AAB make the `.aab` file bigger; they feed
   Play's crash reports. When the limit is on the `.aab` file itself (a CI cap, an upload
   tool), export them as a separate zip instead
   ([Android symbols](https://docs.unity.com/en-us/engine/6000.3/manual/platform-specific/android/developing/testing-and-debugging/symbols),
   [native symbols](https://developer.android.com/build/include-native-symbols)).
7. **Videos** in `StreamingAssets` ship byte for byte. Re-encode them in H.264 at the display
   size, with `ffmpeg -i in.mov -c:v libx264 -crf 23 -pix_fmt yuv420p -c:a aac out.mp4`: 8-bit
   4:2:0 is what Android hardware decoders read
   ([Android supported media formats](https://developer.android.com/media/platform/supported-formats)).
8. **Code size** (Strip Engine Code, Managed Stripping Level, IL2CPP Code Generation) belongs
   to `unity-build-pipeline`; go there when native libraries dominate the APK.

## Verify

Install what Play would serve and play to actual gameplay:

```bash
bundletool install-apks --apks=MyGame.apks
```

For an APK, `adb install -r MyGame.apk`. Check recompressed textures on a real device, at the
distance players see them.
