/* =============================================================
   GEMA SOUND ENGINE - AUDIO FEEDBACK SYSTEM
   ============================================================= */

// 1. تعريف ملف الصوت (تأكد من علامة / في الأول)
const clickSound = new Audio('/assets/sounds/click.mp3');
clickSound.volume = 0.1; // خليه هادي جداً عشان يكون احترافي

// 2. وظيفة تشغيل الصوت
const playClick = () => {
    // إرجاع الصوت للبداية عشان لو ضغطت بسرعة ورا بعض يشتغل
    clickSound.currentTime = 0;
    clickSound.play().catch(err => {
        // المتصفحات بتمنع الصوت يشتغل غير لما المستخدم يلمس الصفحة الأول
        console.log("Audio waiting for user interaction...");
    });
};

// 3. مراقبة الموقع بالكامل (Global Listener)
document.addEventListener('click', (e) => {
    // هل العنصر اللي ضغطنا عليه زرار، لينك، كارت، أو أيقونة لغة؟
    const isClickable = e.target.closest('button, a, .gema-card, .lang-btn, .menu-toggle');
    
    if (isClickable) {
        playClick();
    }
});