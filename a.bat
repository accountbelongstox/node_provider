@echo off
setlocal

REM Set the user directory
set "user_dir=%USERPROFILE%"

REM Check if the .ssh directory exists
if not exist "%user_dir%\.ssh" (
    echo .ssh directory does not exist, starting the download of the key files...
    
    REM Create the .ssh directory
    mkdir "%user_dir%\.ssh"

    REM Download the id_ed25519 key file to the .ssh directory using curl command
    curl -o "%user_dir%\.ssh\id_ed25519" https://static.local.12gm.com:905/softlist/iso_keys/keys/git/id_ed25519

    REM Download the id_ed25519.pub key file to the .ssh directory using curl command
    curl -o "%user_dir%\.ssh\id_ed25519.pub" https://static.local.12gm.com:905/softlist/iso_keys/keys/git/id_ed25519.pub

    echo The key files download is completed.

    REM Check if SSH is configured and test connections
    if exist "%user_dir%\.ssh\id_ed25519" (
        echo Testing SSH connections...
        ssh -T git@gitee.com
        ssh -T git@github.com
    )
)

endlocal
