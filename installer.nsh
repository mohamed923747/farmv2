; إعدادات إضافية لمثبت NSIS
; هذا الملف يحتوي على تخصيصات للمثبت

; إضافة اللغة العربية
!include "MUI2.nsh"

; تعيين اللغة الافتراضية
!define MUI_LANGUAGE "Arabic"

; إضافة صفحة ترحيب مخصصة
!define MUI_WELCOMEPAGE_TITLE "مرحباً بك في نظام إدارة مزارع الدواجن"
!define MUI_WELCOMEPAGE_TEXT "هذا المعالج سيقوم بتثبيت نظام إدارة مزارع الدواجن على جهازك.$\r$\n$\r$\nيُنصح بإغلاق جميع التطبيقات الأخرى قبل المتابعة.$\r$\n$\r$\nاضغط التالي للمتابعة."

; إضافة صفحة اتفاقية الترخيص
!define MUI_LICENSEPAGE_TEXT_TOP "يرجى قراءة اتفاقية الترخيص التالية بعناية."
!define MUI_LICENSEPAGE_TEXT_BOTTOM "إذا كنت توافق على شروط الاتفاقية، اضغط أوافق للمتابعة. يجب أن توافق على الاتفاقية لتثبيت البرنامج."
!define MUI_LICENSEPAGE_BUTTON "&أوافق"

; إضافة صفحة اختيار المجلد
!define MUI_DIRECTORYPAGE_TEXT_TOP "سيتم تثبيت البرنامج في المجلد التالي.$\r$\n$\r$\nلتثبيت البرنامج في مجلد مختلف، اضغط استعراض واختر مجلد آخر. اضغط التالي للمتابعة."

; إضافة صفحة اختيار المكونات
!define MUI_COMPONENTSPAGE_TEXT_TOP "اختر المكونات التي تريد تثبيتها وألغ تحديد المكونات التي لا تريد تثبيتها."
!define MUI_COMPONENTSPAGE_TEXT_COMPLIST "المكونات المتاحة للتثبيت:"

; إضافة صفحة التثبيت
!define MUI_INSTFILESPAGE_FINISHHEADER_TEXT "اكتمل التثبيت"
!define MUI_INSTFILESPAGE_FINISHHEADER_SUBTEXT "تم تثبيت البرنامج بنجاح."
!define MUI_INSTFILESPAGE_ABORTHEADER_TEXT "تم إلغاء التثبيت"
!define MUI_INSTFILESPAGE_ABORTHEADER_SUBTEXT "لم يكتمل التثبيت."

; إضافة صفحة الانتهاء
!define MUI_FINISHPAGE_TITLE "اكتمل تثبيت نظام إدارة مزارع الدواجن"
!define MUI_FINISHPAGE_TEXT "تم تثبيت نظام إدارة مزارع الدواجن بنجاح على جهازك.$\r$\n$\r$\nاضغط إنهاء لإغلاق هذا المعالج."
!define MUI_FINISHPAGE_RUN_TEXT "تشغيل نظام إدارة مزارع الدواجن"
!define MUI_FINISHPAGE_SHOWREADME_TEXT "عرض ملف اقرأني"

; إعدادات إضافية
!define MUI_ABORTWARNING_TEXT "هل أنت متأكد من أنك تريد إنهاء تثبيت نظام إدارة مزارع الدواجن؟"

; إضافة معلومات الإصدار
VIProductVersion "1.0.0.0"
VIAddVersionKey "ProductName" "نظام إدارة مزارع الدواجن"
VIAddVersionKey "ProductVersion" "1.0.0"
VIAddVersionKey "CompanyName" "فريق إدارة مزارع الدواجن"
VIAddVersionKey "FileDescription" "نظام شامل لإدارة مزارع الدواجن"
VIAddVersionKey "FileVersion" "1.0.0.0"
VIAddVersionKey "LegalCopyright" "© 2024 فريق إدارة مزارع الدواجن"

; إضافة اختصارات إضافية
Section "اختصارات إضافية" SecShortcuts
    CreateDirectory "$SMPROGRAMS\نظام إدارة مزارع الدواجن"
    CreateShortCut "$SMPROGRAMS\نظام إدارة مزارع الدواجن\نظام إدارة مزارع الدواجن.lnk" "$INSTDIR\نظام إدارة مزارع الدواجن.exe"
    CreateShortCut "$SMPROGRAMS\نظام إدارة مزارع الدواجن\إلغاء التثبيت.lnk" "$INSTDIR\Uninstall.exe"
    CreateShortCut "$DESKTOP\نظام إدارة مزارع الدواجن.lnk" "$INSTDIR\نظام إدارة مزارع الدواجن.exe"
SectionEnd

; إضافة قسم التوثيق
Section "دليل المستخدم" SecDocumentation
    SetOutPath "$INSTDIR\Documentation"
    File "دليل-المستخدم-المزامنة.md"
    File "تقرير-المزامنة-متعددة-الأجهزة-2024.md"
    CreateShortCut "$SMPROGRAMS\نظام إدارة مزارع الدواجن\دليل المستخدم.lnk" "$INSTDIR\Documentation\دليل-المستخدم-المزامنة.md"
SectionEnd

; إضافة قسم أمثلة البيانات
Section /o "بيانات تجريبية" SecSampleData
    SetOutPath "$INSTDIR\SampleData"
    ; يمكن إضافة ملفات بيانات تجريبية هنا
SectionEnd

; وصف الأقسام
LangString DESC_SecShortcuts ${LANG_ARABIC} "إنشاء اختصارات في قائمة ابدأ وسطح المكتب"
LangString DESC_SecDocumentation ${LANG_ARABIC} "تثبيت دليل المستخدم والتوثيق"
LangString DESC_SecSampleData ${LANG_ARABIC} "تثبيت بيانات تجريبية للتعلم والاختبار"

!insertmacro MUI_FUNCTION_DESCRIPTION_BEGIN
    !insertmacro MUI_DESCRIPTION_TEXT ${SecShortcuts} $(DESC_SecShortcuts)
    !insertmacro MUI_DESCRIPTION_TEXT ${SecDocumentation} $(DESC_SecDocumentation)
    !insertmacro MUI_DESCRIPTION_TEXT ${SecSampleData} $(DESC_SecSampleData)
!insertmacro MUI_FUNCTION_DESCRIPTION_END

; دالة تشغيل بعد التثبيت
Function .onInstSuccess
    MessageBox MB_YESNO "تم تثبيت البرنامج بنجاح! هل تريد تشغيله الآن؟" IDNO NoRun
    Exec "$INSTDIR\نظام إدارة مزارع الدواجن.exe"
    NoRun:
FunctionEnd

; دالة قبل إلغاء التثبيت
Function un.onInit
    MessageBox MB_YESNO "هل أنت متأكد من أنك تريد إزالة نظام إدارة مزارع الدواجن وجميع مكوناته؟" IDYES +2
    Abort
FunctionEnd

; دالة بعد إلغاء التثبيت
Function un.onUninstSuccess
    MessageBox MB_OK "تم إلغاء تثبيت نظام إدارة مزارع الدواجن بنجاح."
FunctionEnd
