<<<<<<< HEAD
#!/bin/bash
timestamp=$(date +"%Y-%m-%d %H:%M:%S")
git add .
git commit -m "$timestamp"
git push --set-upstream origin master
=======
@echo off
setlocal
REM YYYY-MM-DD HH:MM:SS
for /f "delims=" %%a in ('wmic OS Get localdatetime ^| find "."') do set datetime=%%a
set "year=%datetime:~0,4%"
set "month=%datetime:~4,2%"
set "day=%datetime:~6,2%"
set "hour=%datetime:~8,2%"
set "minute=%datetime:~10,2%"
set "second=%datetime:~12,2%"
set "timestamp=%year%-%month%-%day% %hour%:%minute%:%second%"
REM git
git add .
git commit -m "%timestamp%"
git push --set-upstream origin master
endlocal
        
>>>>>>> 7277f84d66832d12cb6601508e31e28ae87fed3f
