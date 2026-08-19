Set-Location "c:\Users\JFreeman\OneDrive - Quest\Documents\Code\ProductTest"
$ErrorActionPreference = "Stop"

function Read-AnswerMap($path) {
  $map = @{}
  if (Test-Path $path) {
    Get-Content $path | ForEach-Object {
      $line = $_.Trim()
      if (-not $line -or $line.StartsWith("#")) { return }
      $parts = $line -split "=", 2
      if ($parts.Count -eq 2) { $map[$parts[0].Trim()] = $parts[1].Trim() }
    }
  }
  return $map
}

$skills = @(Get-Content ".skills" | ForEach-Object { $_.Trim() } | Where-Object { $_ -and -not $_.StartsWith("#") })
$cacheDir = Join-Path $PWD ".skill-cache"
New-Item -ItemType Directory -Force -Path $cacheDir | Out-Null

$fetchTargets = @()
foreach ($s in $skills) {
  $fetchTargets += [PSCustomObject]@{ Type="skill"; Name=$s; Url="https://raw.githubusercontent.com/slowpulsestudio/iris-proto-build-react/main/skills/$s.md" }
}
$fetchTargets += [PSCustomObject]@{ Type="example"; Name="example-prompts.md"; Url="https://raw.githubusercontent.com/slowpulsestudio/iris-proto-build-react/main/example-prompts.md" }

$jobs = @()
foreach ($t in $fetchTargets) {
  $jobs += Start-Job -ScriptBlock {
    param($target)
    try {
      $resp = Invoke-WebRequest -Uri $target.Url -UseBasicParsing
      [PSCustomObject]@{ Name=$target.Name; Type=$target.Type; Url=$target.Url; Ok=$true; StatusCode=[int]$resp.StatusCode; Content=[string]$resp.Content; Error=$null }
    } catch {
      $status = $null
      if ($_.Exception.Response -and $_.Exception.Response.StatusCode) { $status = [int]$_.Exception.Response.StatusCode }
      [PSCustomObject]@{ Name=$target.Name; Type=$target.Type; Url=$target.Url; Ok=$false; StatusCode=$status; Content=$null; Error=$_.Exception.Message }
    }
  } -ArgumentList $t
}
$results = Receive-Job -Job $jobs -Wait
$jobs | Remove-Job -Force

$report = [ordered]@{}
$report.SkillsRequested = $skills
$report.FetchCount = $fetchTargets.Count
$report.SuccessSkills = @($results | Where-Object { $_.Type -eq "skill" -and $_.Ok } | Select-Object -ExpandProperty Name)
$report.FailedSkills = @($results | Where-Object { $_.Type -eq "skill" -and -not $_.Ok } | Select-Object -ExpandProperty Name)
$report.FetchFailures = @($results | Where-Object { -not $_.Ok } | ForEach-Object { $sc = if ($_.StatusCode) { $_.StatusCode } else { "n/a" }; "{0} ({1}) {2}" -f $_.Name, $sc, $_.Error })

if ($report.FailedSkills.Count -gt 0) {
  $report.StoppedBeforeMasterWrite = $true
  $report | ConvertTo-Json -Depth 16
  exit 0
}

$skillContentMap = @{}
foreach ($r in ($results | Where-Object { $_.Type -eq "skill" -and $_.Ok })) { $skillContentMap[$r.Name] = $r.Content }
$assembled = ($skills | ForEach-Object { $skillContentMap[$_] }) -join "`r`n`r`n"

$masterPath = "master-skills.md"
if (-not (Test-Path $masterPath)) {
  Set-Content -Path $masterPath -Value $assembled -NoNewline
  $masterStatus = "created"
} else {
  $existingMaster = Get-Content $masterPath -Raw
  if ($existingMaster -eq $assembled) { $masterStatus = "up-to-date" } else { Set-Content -Path $masterPath -Value $assembled -NoNewline; $masterStatus = "updated" }
}
$masterLineCount = (Get-Content $masterPath | Measure-Object -Line).Lines

$exampleContent = ($results | Where-Object { $_.Type -eq "example" -and $_.Ok } | Select-Object -First 1 -ExpandProperty Content)
$examplePath = "example-prompts.md"
if (-not (Test-Path $examplePath)) {
  Set-Content -Path $examplePath -Value $exampleContent -NoNewline
  $exampleStatus = "created"
} else {
  $existingExample = Get-Content $examplePath -Raw
  if ($existingExample -eq $exampleContent) { $exampleStatus = "up-to-date" } else { Set-Content -Path $examplePath -Value $exampleContent -NoNewline; $exampleStatus = "updated" }
}

Add-Type -AssemblyName System.IO.Compression.FileSystem
$resourceMappings = @()
foreach ($s in $skills) {
  $lines = ($skillContentMap[$s] -split "`r?`n")
  $start = -1
  for ($i=0; $i -lt $lines.Count; $i++) { if ($lines[$i].Trim() -eq "## Resources") { $start = $i + 1; break } }
  if ($start -lt 0) { continue }
  for ($j=$start; $j -lt $lines.Count; $j++) {
    $line = $lines[$j].Trim()
    if ($line -match "^##\\s+") { break }
    if (-not $line -or $line -match '^```' -or $line.StartsWith("#")) { continue }
    if ($line -match "^([^\\s].*?/)[ \\t]*->[ \\t]*(.+?/)$") {
      $resourceMappings += [PSCustomObject]@{ Skill=$s; Source=$matches[1].Trim(); Dest=$matches[2].Trim() }
    }
  }
}

$copiedBySkill = @{}
$skippedBySkill = @{}
$resourceErrors = @()
if ($resourceMappings.Count -gt 0) {
  $zipPath = Join-Path $cacheDir "iris-proto-build-react-main.zip"
  Invoke-WebRequest -Uri "https://github.com/slowpulsestudio/iris-proto-build-react/archive/refs/heads/main.zip" -OutFile $zipPath -UseBasicParsing
  $zip = [System.IO.Compression.ZipFile]::OpenRead($zipPath)
  try {
    foreach ($m in $resourceMappings) {
      $prefix = "iris-proto-build-react-main/skill-resources/$($m.Skill)/$($m.Source)"
      $entries = @($zip.Entries | Where-Object { $_.FullName.StartsWith($prefix) -and -not $_.FullName.EndsWith("/") })
      if ($entries.Count -eq 0) { $resourceErrors += "No files matched prefix: $prefix"; continue }
      if (-not $copiedBySkill.ContainsKey($m.Skill)) { $copiedBySkill[$m.Skill] = New-Object System.Collections.ArrayList }
      if (-not $skippedBySkill.ContainsKey($m.Skill)) { $skippedBySkill[$m.Skill] = New-Object System.Collections.ArrayList }
      foreach ($e in $entries) {
        $rel = $e.FullName.Substring($prefix.Length).TrimStart("/")
        $destPath = Join-Path $PWD (Join-Path $m.Dest $rel)
        $destDir = Split-Path -Parent $destPath
        if ($destDir -and -not (Test-Path $destDir)) { New-Item -ItemType Directory -Force -Path $destDir | Out-Null }
        $tmpFile = Join-Path $cacheDir ([Guid]::NewGuid().ToString())
        [System.IO.Compression.ZipFileExtensions]::ExtractToFile($e, $tmpFile, $true)
        try {
          if (Test-Path $destPath) {
            $existingBytes = [System.IO.File]::ReadAllBytes($destPath)
            $newBytes = [System.IO.File]::ReadAllBytes($tmpFile)
            $different = $true
            if ($existingBytes.Length -eq $newBytes.Length) {
              $different = $false
              for ($bi=0; $bi -lt $existingBytes.Length; $bi++) { if ($existingBytes[$bi] -ne $newBytes[$bi]) { $different = $true; break } }
            }
            if ($different) { [void]$skippedBySkill[$m.Skill].Add((Resolve-Path -Relative $destPath)) } else { [void]$copiedBySkill[$m.Skill].Add((Resolve-Path -Relative $destPath)) }
          } else {
            Copy-Item $tmpFile $destPath
            [void]$copiedBySkill[$m.Skill].Add((Resolve-Path -Relative $destPath))
          }
        } finally {
          Remove-Item $tmpFile -Force -ErrorAction SilentlyContinue
        }
      }
    }
  } finally { $zip.Dispose() }
}

if ($resourceErrors.Count -gt 0) {
  $report.StoppedOnResourceError = $true
  $report.ResourceErrors = $resourceErrors
  $report.MasterStatus = $masterStatus
  $report.MasterLineCount = $masterLineCount
  $report.ExamplePromptsStatus = $exampleStatus
  $report | ConvertTo-Json -Depth 16
  exit 0
}

$answers = Read-AnswerMap ".skill-answers"
$projectName = $answers["project-name"]
$titleUpdated = $false
$titlePath = $null
$indexCandidates = @("src/iris-shell/index.html","src/iris-ui/index.html","index.html")
foreach ($cand in $indexCandidates) {
  if (Test-Path $cand) {
    $titlePath = $cand
    $html = Get-Content $cand -Raw
    if ($projectName -and $html -match "<title>.*?</title>") {
      $newHtml = [System.Text.RegularExpressions.Regex]::Replace($html,"<title>.*?</title>","<title>$projectName</title>")
      if ($newHtml -ne $html) { Set-Content -Path $cand -Value $newHtml -NoNewline; $titleUpdated = $true }
    }
    break
  }
}

$createdFiles = @()
$existingFiles = @()

$copilotPath = ".github/copilot-instructions.md"
$sharedText = "Read master-skills.md and prototype-specific-agent-instructions.md for your operating instructions.`n"
if (-not (Test-Path $copilotPath)) { Set-Content $copilotPath $sharedText -NoNewline; $createdFiles += $copilotPath } else { $existingFiles += $copilotPath }

$claudePath = "CLAUDE.md"
if (-not (Test-Path $claudePath)) { Set-Content $claudePath $sharedText -NoNewline; $createdFiles += $claudePath } else { $existingFiles += $claudePath }

$protoPath = "prototype-specific-agent-instructions.md"
$protoText = "# Prototype-specific agent instructions`r`n`r`nAdd any instructions here that are specific to this prototype - design decisions, constraints, what you are testing, known issues, personas, etc. This file is never overwritten by /skill-me-up.`n"
if (-not (Test-Path $protoPath)) { Set-Content $protoPath $protoText -NoNewline; $createdFiles += $protoPath } else { $existingFiles += $protoPath }

$readmePath = "README.md"
if (-not (Test-Path $readmePath)) {
  $desc = $answers["project-description"]
  $figma = $null
  if (Test-Path ".figma-url") { $figma = (Get-Content ".figma-url" -Raw).Trim() }
  $lines = @()
  $lines += "# $projectName"
  $lines += ""
  $lines += "$desc"
  $lines += ""
  $lines += "Generated by [Up-Skill](https://github.com/slowpulsestudio/iris-proto-build-react) - an AI prototyping skills library. This project AI instructions are assembled from the skills below into master-skills.md. To pull in the latest skill updates, run /skill-me-up again."
  $lines += ""
  if ($figma) { $lines += "**Figma file:** $figma"; $lines += "" }
  $lines += "## Skills used"
  foreach ($s in $skills) { $lines += "- $s" }
  Set-Content $readmePath ($lines -join "`r`n") -NoNewline
  $createdFiles += $readmePath
} else {
  $existingFiles += $readmePath
}

$report.MasterStatus = $masterStatus
$report.MasterLineCount = $masterLineCount
$report.ExamplePromptsStatus = $exampleStatus
$report.CopiedBySkill = $copiedBySkill
$report.SkippedConflictsBySkill = $skippedBySkill
$report.ResourceErrors = $resourceErrors
$report.IndexTitleFile = $titlePath
$report.IndexTitleUpdated = $titleUpdated
$report.CreatedFiles = $createdFiles
$report.ExistingFiles = $existingFiles
$report.HasChanges = ($masterStatus -ne "up-to-date" -or $exampleStatus -ne "up-to-date" -or $createdFiles.Count -gt 0 -or $titleUpdated -or $copiedBySkill.Count -gt 0)

$report | ConvertTo-Json -Depth 16
