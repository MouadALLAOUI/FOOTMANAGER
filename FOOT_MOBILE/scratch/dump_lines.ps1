param([string]$Path)

[Windows.Globalization.Language, Windows.Globalization, ContentType=WindowsRuntime] | Out-Null
[Windows.Media.Ocr.OcrEngine, Windows.Foundation, ContentType=WindowsRuntime] | Out-Null
[Windows.Graphics.Imaging.BitmapDecoder, Windows.Graphics.Imaging, ContentType=WindowsRuntime] | Out-Null
[Windows.Storage.StorageFile, Windows.Storage, ContentType=WindowsRuntime] | Out-Null
Add-Type -AssemblyName System.Runtime.WindowsRuntime

$asTaskGeneric = [System.WindowsRuntimeSystemExtensions].GetMethods() | ? { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.IsGenericMethod } | Select -First 1

function Await($winRtOp, $resultType) {
    $m = $asTaskGeneric.MakeGenericMethod($resultType)
    $task = $m.Invoke($null, @($winRtOp))
    $task.Wait()
    return $task.Result
}

function Dump-OcrLines($filePath) {
    $fileOp = [Windows.Storage.StorageFile]::GetFileFromPathAsync($filePath)
    $file = Await $fileOp ([Windows.Storage.StorageFile])
    
    $streamOp = $file.OpenAsync([Windows.Storage.FileAccessMode]::Read)
    $stream = Await $streamOp ([Windows.Storage.Streams.IRandomAccessStream])
    
    $decOp = [Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)
    $decoder = Await $decOp ([Windows.Graphics.Imaging.BitmapDecoder])
    
    $bmpOp = $decoder.GetSoftwareBitmapAsync()
    $bitmap = Await $bmpOp ([Windows.Graphics.Imaging.SoftwareBitmap])
    
    $engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage([Windows.Globalization.Language]::new('ar'))
    if (-not $engine) {
        $engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
    }
    
    $recOp = $engine.RecognizeAsync($bitmap)
    $res = Await $recOp ([Windows.Media.Ocr.OcrResult])
    
    foreach ($line in $res.Lines) {
        Write-Host "$($line.Text)"
    }
}

Dump-OcrLines $Path
