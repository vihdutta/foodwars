param (
    [string]$TargetDir = "."
)

# delete all .js files
Get-ChildItem -Path $TargetDir -Filter *.js -Recurse -File |
    Remove-Item -Force

# delete all .js.map files
Get-ChildItem -Path $TargetDir -Filter *.js.map -Recurse -File |
    Remove-Item -Force
