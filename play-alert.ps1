# Claude alert — plays the alert sound
# Called by Claude Code's Stop hook

$soundPath = "C:\Windows\Media\tada.wav"

# Fallback if tada.wav doesn't exist
if (-not (Test-Path $soundPath)) {
    $soundPath = "C:\Windows\Media\notify.wav"
}

# Fallback if no sound is found at all
if (-not (Test-Path $soundPath)) {
    Write-Host "Claude alert: no sound found"
    exit 1
}

# Play the sound via System.Media.SoundPlayer
try {
    Add-Type -AssemblyName presentationCore
    $player = New-Object System.Media.SoundPlayer $soundPath
    $player.PlaySync()
    exit 0
} catch {
    Write-Host "Claude alert: playback error ($($_.Exception.Message))"
    exit 1
}
