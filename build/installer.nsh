!macro customInit
  nsExec::ExecToLog 'taskkill /F /IM "AG Typing Tutor.exe" /T'
  nsExec::ExecToLog 'taskkill /F /IM "AG-Typing-Tutor-Portable-1.0.0.exe" /T'
  Sleep 800
!macroend
