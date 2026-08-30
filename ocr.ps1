[Windows.Media.Ocr.OcrEngine, Windows.Foundation, ContentType = WindowsRuntime] | Out-Null
[Windows.Graphics.Imaging.BitmapDecoder, Windows.Foundation, ContentType = WindowsRuntime] | Out-Null
[Windows.Storage.StorageFile, Windows.Foundation, ContentType = WindowsRuntime] | Out-Null

$imgPAth = "C:\Users\sajal\OneDrive\Pictures\Screenshots\Screenshot 2026-08-30 204254.png"
$fileTask = [Windows.Storage.StorageFile]::GetFileFromPathAsync($imgPAth)
$fileTask.AsTask().Wait()
$file = $fileTask.GetResults()

$streamTask = $file.OpenAsync([Windows.Storage.FileAccessMode]::Read)
$streamTask.AsTask().Wait()
$stream = $streamTask.GetResults()

$decoderTask = [Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)
$decoderTask.AsTask().Wait()
$decoder = $decoderTask.GetResults()

$bitmapTask = $decoder.GetSoftwareBitmapAsync()
$bitmapTask.AsTask().Wait()
$bitmap = $bitmapTask.GetResults()

$engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
$ocrTask = $engine.RecognizeAsync($bitmap)
$ocrTask.AsTask().Wait()
$result = $ocrTask.GetResults()

Write-Output $result.Text
