' Apna Advisor - starter button.
' Silently launches the app (no console window) and opens it in your browser.
Option Explicit

Dim fs, shell, scriptDir, batPath
Set fs = CreateObject("Scripting.FileSystemObject")
scriptDir = fs.GetParentFolderName(WScript.ScriptFullName)
batPath = scriptDir & "\launcher\launch.bat"

Set shell = CreateObject("WScript.Shell")
shell.CurrentDirectory = scriptDir
' Run hidden (0), do not wait for completion (False)
shell.Run """" & batPath & """", 0, False

Set shell = Nothing
Set fs = Nothing
