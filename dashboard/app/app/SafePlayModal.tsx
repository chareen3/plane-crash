'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ShieldCheck, Shield } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

const STORAGE_KEY = 'crash_tracker_tips_seen';

interface TipContent {
  category: string;
  title: string;
  body: string;
  motivation: string;
}

interface LanguageTips {
  en: TipContent[];
  si: TipContent[];
  ta: TipContent[];
}

const tipsData: LanguageTips = {
  en: [
    {
      category: 'Bankroll Discipline',
      title: 'Set a Hard Daily Limit',
      body: 'Decide your maximum loss amount before you open the game — not after. Once you reach it, close the app immediately. Successful players protect their capital like a business budget. Winnings are built on patience, not emotional chase.',
      motivation: 'Treat your bankroll like capital. Protect it to play another day.'
    },
    {
      category: 'Time Awareness',
      title: 'Set a Session Time Limit',
      body: 'Set a phone alarm. Stop playing after 30-45 minutes — regardless of results. Continuous play triggers cognitive bias and fatigue, which destroys your decision-making reflexes. The house edge thrives on tired players.',
      motivation: 'Refreshed minds spot pattern changes; fatigued minds spot illusions.'
    },
    {
      category: 'Mindset Shift',
      title: 'Losses are Entertainment Costs',
      body: 'Winnings are bonuses, not income. Treat money spent as the cost of a ticket to a show. Removing the desperate pressure of "needing" to win allows you to execute precise, safe cashouts (1.10x - 1.35x) instead of chasing risky peaks.',
      motivation: 'Accept variance calmly. Play for analytics, not survival.'
    },
    {
      category: 'Emotional Control',
      title: 'Bypass Frustration and Stress',
      body: 'Fatigue, anger, and stress override analytical strategies. If you feel frustrated after a loss, close the app. Our Hold Score engine monitors volatility, but your self-control is the final and strongest circuit breaker.',
      motivation: 'Control your emotions, or the rounds will control your balance.'
    },
    {
      category: 'AI Reality',
      title: 'Probabilities, Not Certainties',
      body: 'The algorithm runs timezone matches, n-gram sequences, and cluster risks across 5,000+ rounds. But provably fair RNG means each round is mathematically independent. Safe targets are sustainable; chasing multipliers is high-risk.',
      motivation: 'Manage risk with statistics. Never believe a big multiplier is "due".'
    },
    {
      category: 'Discipline Support',
      title: 'Know When to Walk Away',
      body: 'CrashTracker is an analytical discipline tool, not a wealth generator. If gambling causes anxiety, stress, or relationship strain, take a step back immediately. Enable lock features or reach out to support.',
      motivation: 'Walking away when needed is the ultimate player victory.'
    }
  ],
  si: [
    {
      category: 'මුදල් කළමනාකරණය',
      title: 'දෛනික සීමාවක් තබා ගන්න',
      body: 'ක්‍රීඩාව ආරම්භ කිරීමට පෙර ඔබේ උපරිම අලාභ සීමාව තීරණය කරන්න. එම සීමාවට පැමිණි විගස ක්‍රීඩාවෙන් ඉවත් වන්න. සාර්ථක ක්‍රීඩකයින් තම මුදල් ව්‍යාපාරික ප්‍රාග්ධනයක් ලෙස ආරක්ෂා කරයි. ජයග්‍රහණ ලැබෙන්නේ ඉවසීමෙන් මිස හැඟීම්වලට වහල් වීමෙන් නොවේ.',
      motivation: 'ඔබේ ක්‍රීඩා ප්‍රාග්ධනය ආරක්ෂා කරගන්න, එවිට ඔබට තවදුරටත් ක්‍රීඩාවේ රැඳී සිටිය හැක.'
    },
    {
      category: 'කාලය පිළිබඳ අවබෝධය',
      title: 'කාල සීමාවක් සකසන්න',
      body: 'දුරකථනයේ එලාම් එකක් සකසා ගන්න. විනාඩි 30-45 කට පසු ක්‍රීඩා කිරීම නතර කරන්න. එක දිගට ක්‍රීඩා කිරීම නිසා මොළයේ වෙහෙසකාරී බව වැඩි වන අතර නිවැරදි තීරණ ගැනීමට ඇති හැකියාව නැති වී යයි. සූදු ක්‍රීඩා ආයතන සැමවිටම ප්‍රයෝජන ගන්නේ වෙහෙසට පත් ක්‍රීඩකයින්ගෙනි.',
      motivation: 'නිරවුල් මනසක් රටාවන් හඳුනා ගනී; වෙහෙස වූ මනසක් මුළාවන් දකී.'
    },
    {
      category: 'මානසිකත්වය',
      title: 'අලාභය විනෝදාස්වාදයේ පිරිවැයක් ලෙස දකින්න',
      body: 'ජයග්‍රහණ යනු අමතර වාසියක් මිස ස්ථිර ආදායමක් නොවේ. ක්‍රීඩාවේ අලාභ සිනමා ප්‍රවේශ පත්‍රයක් වැනි විනෝදාස්වාද වියදමක් ලෙස සලකන්න. එවිට ඔබට අනවශ්‍ය පීඩනයකින් තොරව 1.10x - 1.35x වැනි ආරක්ෂිත සීමාවන්ගෙන් මුදල් ලබාගත හැක.',
      motivation: 'සංඛ්‍යාලේඛන මඟින් අවදානම පාලනය කරන්න. කිසිවිටෙක සහතික කිරීම් විශ්වාස නොකරන්න.'
    },
    {
      category: 'හැඟීම් පාලනය',
      title: 'කෝපයෙන් හෝ වෙහෙසෙන් ක්‍රීඩා නොකරන්න',
      body: 'වෙහෙස, කෝපය හෝ පීඩනය නිසා සංඛ්‍යාත්මක උපක්‍රම අමතක වේ. ඔබට අලාභයක් සිදු වී කෝපයක් හෝ කලකිරීමක් දැනේ නම්, වහාම ක්‍රීඩාව නවත්වන්න. අපගේ Hold Score පද්ධතිය අවදානම් තත්ත්වයන් අනතුරු ඇඟවුවද ඔබේ ස්වයං පාලනය අවසාන ආරක්ෂකයා වේ.',
      motivation: 'ඔබේ හැඟීම් පාලනය කරන්න, නැතහොත් ක්‍රීඩා වටයන් ඔබේ මුදල් පාලනය කරනු ඇත.'
    },
    {
      category: 'AI විශ්ලේෂණය',
      title: 'AI පෙන්වන්නේ සම්භාවිතාව පමණි',
      body: 'අපගේ ඇල්ගොරිතම වට 5,000 කට වඩා විශ්ලේෂණය කරයි. නමුත් සෑම වටයක්ම එකිනෙකට ස්වාධීන වේ. AI සපයන දත්ත අවදානම කළමනාකරණය කිරීමට මිස සහතික කළ ජයග්‍රහණ සඳහා නොවේ.',
      motivation: 'සංඛ්‍යාලේඛන මඟින් අවදානම පාලනය කරන්න. කිසිවිටෙක සහතික කිරීම් විශ්වාස නොකරන්න.'
    },
    {
      category: 'ආරක්ෂිත ක්‍රීඩාව',
      title: 'නතර කළ යුතු වේලාව දැනගන්න',
      body: 'ක්‍රීඩාව ඔබට මානසික පීඩනයක්, කනස්සල්ලක් හෝ පවුලේ සබඳතාවලට බාධාවක් ඇති කරන්නේ නම්, වහාම එය නවත්වන්න. අවශ්‍ය නම් ගිණුම තාවකාලිකව අක්‍රීය කිරීමේ සීමාවන් සක්‍රීය කරන්න.',
      motivation: 'අවශ්‍ය වෙලාවට ක්‍රීඩාවෙන් ඉවත් වීම සැබෑ ක්‍රීඩකයෙකුගේ ලක්ෂණයකි.'
    }
  ],
  ta: [
    {
      category: 'பண மேலாண்மை',
      title: 'தினசரி இழப்பு எல்லையை வகுத்திடுங்கள்',
      body: 'விளையாட்டைத் தொடங்கும் முன்பே உங்களின் அதிகபட்ச இழப்பு எல்லையைத் தீர்மானியுங்கள் — விளையாடிய பின் அல்ல. அந்த எல்லையை எட்டியதும் விளையாட்டை நிறுத்துங்கள். வெற்றிகரமான வீரர்கள் தங்கள் பணத்தை வணிக மூலதனமாகப் பாதுகாக்கிறார்கள். வெற்றிகள் என்பது இலாபத்தை அடிப்படையாகக் கொண்டது, அவசரத்தை அல்ல.',
      motivation: 'உங்கள் விளையாட்டு மூலதனத்தைப் பாதுகாக்கவும், அப்போதுதான் நீங்கள் தொடர்ந்து விளையாட முடியும்.'
    },
    {
      category: 'நேர விழிப்புணர்வு',
      title: 'நேர வரம்பை நிர்ணயிக்கவும்',
      body: '30-45 நிமிடங்களுக்குப் பிறகு விளையாடுவதை நிறுத்துங்கள். தொடர்ந்து விளையாடுவது சோர்வை ஏற்படுத்தி உங்களின் சரியான முடிவு எடுக்கும் திறனைப் பாதிக்கும். சோர்வான வீரர்களைக் கொண்டே சூதாட்ட நிறுவனங்கள் லாபம் ஈட்டுகின்றன.',
      motivation: 'தெளிவான மனம் சரியான வழியைக் காட்டும்; சோர்வான மனம் ஏமாற்றத்தைக் கொடுக்கும்.'
    },
    {
      category: 'மனப்பான்மை',
      title: 'இழப்பை பொழுதுபோக்கு செலவாகக் கருதுங்கள்',
      body: 'வெற்றிகள் என்பது போனஸ் மட்டுமே, நிரந்தர வருமானம் அல்ல. இழப்பை ஒரு சினிமா டிக்கெட் போன்ற பொழுதுபோக்கு செலவாகக் கருதுங்கள். இது உங்களை தேவையின்றி அவசரப்பட வைக்காமல் 1.10x - 1.35x போன்ற பாதுகாப்பான இலக்குகளில் வெளியேற உதவும்.',
      motivation: 'புள்ளிவிவரங்களுக்காக விளையாடுங்கள், அவசரப்பட்டு விளையாடாதீர்கள்.'
    },
    {
      category: 'உணர்ச்சி கட்டுப்பாடு',
      title: 'சோர்வு அல்லது கோபத்துடன் விளையாடாதீர்கள்',
      body: 'சோர்வும் கோபமும் உங்களின் பகுப்பாய்வுத் திறனைக் கெடுத்துவிடும். இழப்பு ஏற்பட்டால் கோபப்படாமல் விளையாட்டை உடனடியாக நிறுத்துங்கள். எங்கள் Hold Score அமைப்பு உங்களுக்கு எச்சரிக்கை செய்தாலும் உங்களின் சுய கட்டுப்பாடே மிக முக்கிய பாதுகாப்பு வளையமாகும்.',
      motivation: 'உங்கள் உணர்ச்சிகளைக் கட்டுப்படுத்துங்கள், இல்லையெனில் விளையாட்டு உங்களைக் கட்டுப்படுத்தும்.'
    },
    {
      category: 'AI பகுப்பாய்வு',
      title: 'AI சாத்தியக்கூறுகளை மட்டுமே காட்டுகிறது',
      body: 'எங்கள் வழிமுறை 5,000+ சுற்றுகளை பகுப்பாய்வு செய்கிறது. ஆனால் ஒவ்வொரு சுற்றும் முற்றிலும் தனித்துவமானது. AI முடிவுகள் ஆபத்தை நிர்வகிக்க மட்டுமே, வெற்றி உத்திரவாதத்திற்கு அல்ல.',
      motivation: 'புள்ளிவிவரங்களைக் கொண்டு ஆபத்தை நிர்வகியுங்கள். வெற்றிக்கு உத்திரவாதம் இல்லை.'
    },
    {
      category: 'பாதுகாப்பான விளையாட்டு',
      title: 'எப்போது நிறுத்த வேண்டும் என்பதை அறியுங்கள்',
      body: 'விளையாட்டு உங்களுக்கு மன அழுத்தத்தை அல்லது உறவுகளில் விரிசலை ஏற்படுத்தினால் உடனடியாக நிறுத்துங்கள். தேவைப்பட்டால் கணக்கிற்கான கட்டுப்பாடுகளை அமைத்துக் கொள்ளுங்கள்.',
      motivation: 'தேவைப்படும்போது விலகி நிற்பதே ஒரு சிறந்த வீரரின் வெற்றியாகும்.'
    }
  ]
};

const interfaceTranslations = {
  en: {
    chooseLanguage: "Choose Your Preferred Language",
    selectLanguageSubtitle: "Select your interface language. Winnings are driven by analytical discipline, not guesses.",
    safePlayGuideTitle: "Safe Play Guide",
    welcomeTitle: "Welcome to CrashTracker",
    welcomeSubtitle: "Read this before your first session.",
    safePlayPrinciples: "principles for disciplined play.",
    next: "Next",
    back: "Back",
    gotIt: "Got it, let's go! ✓",
    disclaimerTitle: "Not financial or gambling advice.",
    disclaimerText: "All AI signals are probabilistic — not guarantees. CrashTracker is an analytics & discipline tool. We share data and strategy ideas to help you play more consciously, not to promise profits. If gambling stops feeling fun, please stop immediately.",
    proTip: "PRO TIP",
    loading: "Loading profile...",
  },
  si: {
    chooseLanguage: "ඔබේ ප්‍රියතම භාෂාව තෝරන්න",
    selectLanguageSubtitle: "ක්‍රීඩා අතුරුමුහුණත සඳහා ඔබේ භාෂාව තෝරන්න. ජයග්‍රහණ ලැබෙන්නේ විනයගරුක විශ්ලේෂණයෙන් මිස අනුමානයෙන් නොවේ.",
    safePlayGuideTitle: "ආරක්ෂිත ක්‍රීඩා මාර්ගෝපදේශය",
    welcomeTitle: "CrashTracker වෙත සාදරයෙන් පිළිගනිමු",
    welcomeSubtitle: "පළමු වරට ක්‍රීඩා කිරීමට පෙර මෙය කියවන්න.",
    safePlayPrinciples: "විනයගරුක ක්‍රීඩාවක් සඳහා මූලධර්ම.",
    next: "ඉදිරියට",
    back: "ආපසු",
    gotIt: "තේරුණා, යමු! ✓",
    disclaimerTitle: "මූල්‍ය හෝ සූදු උපදෙස් නොවේ.",
    disclaimerText: "සියලුම AI සංඥා සම්භාවිතාවන් මත පදනම් වන අතර ඒවා සහතික කිරීම් නොවේ. CrashTracker විනය පාලන මෙවලමක් ලෙස භාවිතා කරන්න. වගකීමෙන් යුතුව ක්‍රීඩා කරන්න. ක්‍රීඩාව මානසික පීඩනයක් ඇති කරන්නේ නම් වහාම නතර කරන්න.",
    proTip: "විශේෂ උපදෙස",
    loading: "දත්ත පූරණය වෙමින් පවතී...",
  },
  ta: {
    chooseLanguage: "உங்களது மொழியைத் தேர்ந்தெடுக்கவும்",
    selectLanguageSubtitle: "பயன்படுத்த விரும்பும் மொழியைத் தேர்ந்தெடுக்கவும். வெற்றிகள் விவேகமான கட்டுப்பாட்டைச் சார்ந்தது, ஊகங்களை அல்ல.",
    safePlayGuideTitle: "பாதுகாப்பான விளையாட்டு வழிகாட்டி",
    welcomeTitle: "CrashTracker-க்கு உங்களை வரவேற்கிறோம்",
    welcomeSubtitle: "முதல் முறை விளையாடும் முன் இதைப் படியுங்கள்.",
    safePlayPrinciples: "விளையாட்டுக்கான ஒழுங்குமுறைக் கொள்கைகள்.",
    next: "அடுத்து",
    back: "பின்னால்",
    gotIt: "புரிந்தது, போகலாம்! ✓",
    disclaimerTitle: "நிதி அல்லது சூதாட்ட அறிவுரை அல்ல.",
    disclaimerText: "அனைத்து AI சமிக்ஞைகளும் சாத்தியக்கூறுகள் மட்டுமே, வெற்றி உத்திரவாதங்கள் அல்ல. CrashTracker-ஐ ஒரு பகுப்பாய்வு கருவியாக மட்டுமே பயன்படுத்துங்கள். பொறுப்புடன் விளையாடுங்கள். விளையாட்டு சுமையாகத் தோன்றினால் உடனடியாக நிறுத்துங்கள்.",
    proTip: "சிறப்பு அறிவுரை",
    loading: "விவரங்கள் ஏற்றப்படுகின்றன...",
  }
};

const colors = [
  '#00ffd5', // Step 0 (Language choice)
  '#00e5a0', // Step 1
  '#a78bfa', // Step 2
  '#38bdf8', // Step 3
  '#ff3366', // Step 4
  '#ffd000', // Step 5
  '#f97316', // Step 6
];

export default function SafePlayModal() {
  const [open, setOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(0); // 0 = Language Selector, 1 to 6 = Safe Play principles
  const [selectedLang, setSelectedLang] = useState<'en' | 'si' | 'ta'>('en');
  const [userId, setUserId] = useState<string | null>(null);
  const [firstTime, setFirstTime] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();
  const t = interfaceTranslations[selectedLang];

  useEffect(() => {
    setMounted(true);
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id);
        supabase.from('profiles')
          .select('safe_play_seen, language')
          .eq('id', user.id)
          .single()
          .then(({ data, error }) => {
            setLoading(false);
            if (error || !data) {
              checkLocalStorage();
            } else {
              if (data.language === 'si' || data.language === 'ta' || data.language === 'en') {
                setSelectedLang(data.language);
              }
              if (!data.safe_play_seen) {
                setFirstTime(true);
                setOpen(true);
              }
            }
          });
      } else {
        setLoading(false);
        checkLocalStorage();
      }
    });
  }, []);

  const checkLocalStorage = () => {
    const seen = localStorage.getItem(STORAGE_KEY);
    if (!seen) {
      setFirstTime(true);
      setOpen(true);
    }
  };

  const handleClose = async () => {
    setOpen(false);
    localStorage.setItem(STORAGE_KEY, 'true');
    localStorage.setItem('dashboard_lang', selectedLang);

    if (userId) {
      await supabase.from('profiles').update({
        safe_play_seen: true,
        language: selectedLang
      }).eq('id', userId);
    }

    setFirstTime(false);
    // Reload dashboard to apply language changes globally
    window.location.reload();
  };

  function getSVGAnimation(step: number, colorCode: string) {
    switch (step) {
      case 0:
        return (
          <svg width="120" height="120" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="50" cy="50" r="35" stroke="rgba(0, 255, 213, 0.15)" strokeWidth="1.5" />
            <circle cx="50" cy="50" r="25" stroke="rgba(56, 189, 248, 0.15)" strokeWidth="1" />
            <path d="M50 15 A35 35 0 0 1 85 50" stroke="#00ffd5" strokeWidth="2.5" strokeLinecap="round" className="svg-spin" />
            <path d="M50 25 A25 25 0 0 0 25 50" stroke="#38bdf8" strokeWidth="1.5" strokeLinecap="round" className="svg-spin-reverse" />
            <circle cx="50" cy="50" r="5" fill="#ffffff" className="svg-pulse" />
          </svg>
        );
      case 1:
        return (
          <svg width="120" height="120" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M50 20 L75 30 V55 C75 70 63 80 50 85 C37 80 25 70 25 55 V30 L50 20 Z" stroke={colorCode} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="rgba(0, 229, 160, 0.05)" />
            <path d="M40 50 L47 57 L60 44" stroke={colorCode} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="svg-draw" />
            <circle cx="50" cy="50" r="40" stroke="rgba(0, 229, 160, 0.1)" strokeWidth="1" className="svg-pulse" />
          </svg>
        );
      case 2:
        return (
          <svg width="120" height="120" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="50" cy="50" r="35" stroke={colorCode} strokeWidth="2.5" />
            <path d="M50 22 V50 L65 58" stroke={colorCode} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="svg-rotate" />
            <circle cx="50" cy="50" r="42" stroke="rgba(167, 139, 250, 0.1)" strokeWidth="1.5" className="svg-pulse" />
          </svg>
        );
      case 3:
        return (
          <svg width="120" height="120" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M25 75 H75" stroke={colorCode} strokeWidth="3" strokeLinecap="round" />
            <path d="M50 75 V35" stroke={colorCode} strokeWidth="2.5" />
            <g className="svg-tilt">
              <path d="M35 35 H65" stroke={colorCode} strokeWidth="3" strokeLinecap="round" />
              <path d="M35 35 L25 55" stroke="rgba(56, 189, 248, 0.5)" strokeWidth="1.5" />
              <path d="M65 35 L75 55" stroke="rgba(56, 189, 248, 0.5)" strokeWidth="1.5" />
              <circle cx="25" cy="58" r="6" fill={colorCode} />
              <circle cx="75" cy="58" r="6" fill={colorCode} />
            </g>
          </svg>
        );
      case 4:
        return (
          <svg width="120" height="120" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 35 C12 23 23 12 35 12 C44 12 50 18 50 18 C50 18 56 12 65 12 C77 12 88 23 88 35 C88 56 50 85 50 85 C50 85 12 56 12 35 Z" stroke={colorCode} strokeWidth="2.5" fill="rgba(255, 51, 102, 0.05)" className="svg-beat" />
            <circle cx="50" cy="38" r="18" stroke="rgba(255, 51, 102, 0.2)" strokeWidth="1" className="svg-pulse" />
          </svg>
        );
      case 5:
        return (
          <svg width="120" height="120" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="50" cy="25" r="8" stroke={colorCode} strokeWidth="2.5" />
            <circle cx="25" cy="65" r="8" stroke={colorCode} strokeWidth="2.5" />
            <circle cx="75" cy="65" r="8" stroke={colorCode} strokeWidth="2.5" />
            <path d="M44 31 L31 59" stroke={colorCode} strokeWidth="2" strokeDasharray="4 4" className="svg-dash" />
            <path d="M56 31 L69 59" stroke={colorCode} strokeWidth="2" strokeDasharray="4 4" className="svg-dash-reverse" />
            <path d="M33 65 H67" stroke={colorCode} strokeWidth="2" strokeDasharray="4 4" className="svg-dash" />
          </svg>
        );
      case 6:
        return (
          <svg width="120" height="120" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="25" y="25" width="50" height="50" rx="10" stroke={colorCode} strokeWidth="2.5" fill="rgba(249, 115, 22, 0.05)" />
            <path d="M35 50 H65" stroke={colorCode} strokeWidth="3" strokeLinecap="round" />
            <path d="M50 35 V65" stroke={colorCode} strokeWidth="3" strokeLinecap="round" />
            <circle cx="50" cy="50" r="30" stroke="rgba(249, 115, 22, 0.15)" strokeWidth="1" className="svg-pulse" />
          </svg>
        );
      default:
        return null;
    }
  }

  const activeColor = colors[activeStep];
  const totalSteps = 7; // Step 0 (Language) + 6 principles

  if (loading) return null;

  const modalContent = open ? (
    <div
      onClick={firstTime ? undefined : handleClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        backgroundColor: 'rgba(6, 10, 20, 0.92)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0',
        animation: 'spFadeIn 0.25s ease',
      }}
    >
      <div
        className="onboarding-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '560px',
          height: '480px',
          maxHeight: '90vh',
          backgroundColor: '#070913',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '24px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 40px 100px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.02)',
          position: 'relative',
          animation: 'spSlideUp 0.35s cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        {/* Glow Header */}
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0,
          height: '2px',
          background: `linear-gradient(90deg, transparent 10%, ${activeColor} 50%, transparent 90%)`,
          boxShadow: `0 0 15px ${activeColor}`,
          transition: 'all 0.5s ease',
        }} />

        {/* Top Header */}
        <div style={{
          padding: '24px 32px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          {/* ClickUp Style Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '28px', height: '28px', borderRadius: '8px',
              background: `linear-gradient(135deg, ${activeColor}, #38bdf8)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#070913',
              boxShadow: `0 0 10px ${activeColor}40`,
              transition: 'all 0.5s ease',
            }}>
              <Shield size={14} strokeWidth={2.5} />
            </div>
            <span style={{
              color: '#ffffff',
              fontWeight: '900',
              fontFamily: "'Rajdhani', sans-serif",
              fontSize: '15px',
              letterSpacing: '1px',
              textTransform: 'uppercase'
            }}>CrashTracker</span>
          </div>

          {/* Close Button (Hidden on first onboarding) */}
          {!firstTime && (
            <button
              onClick={handleClose}
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '8px',
                padding: '6px',
                cursor: 'pointer',
                color: '#64748b',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#64748b'}
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Main Content Area */}
        <div style={{
          padding: '16px 32px',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          overflowY: 'auto'
        }}>
          {activeStep === 0 ? (
            /* STEP 0: LANGUAGE SELECTOR (Cloned Pill design) */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px' }}>
                <div style={{ flex: 1 }}>
                  <h2 style={{
                    fontSize: '24px',
                    fontWeight: 800,
                    color: '#ffffff',
                    lineHeight: '1.25',
                    margin: 0,
                    letterSpacing: '-0.02em',
                  }}>{t.chooseLanguage}</h2>
                  <p style={{
                    fontSize: '12.5px',
                    color: '#94a3b8',
                    lineHeight: '1.5',
                    marginTop: '10px',
                    marginRight: '12px'
                  }}>{t.selectLanguageSubtitle}</p>
                </div>
                <div style={{ flexShrink: 0 }}>
                  {getSVGAnimation(0, activeColor)}
                </div>
              </div>

              {/* Pill Selectors */}
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '14px' }}>
                <button
                  onClick={() => setSelectedLang('en')}
                  className={`lang-pill ${selectedLang === 'en' ? 'active' : ''}`}
                  style={{
                    padding: '10px 24px',
                    borderRadius: '20px',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.22s ease-in-out',
                    border: selectedLang === 'en' ? 'none' : '1px solid rgba(255,255,255,0.15)',
                    background: selectedLang === 'en' ? '#ffffff' : 'transparent',
                    color: selectedLang === 'en' ? '#070913' : '#94a3b8',
                  }}
                >
                  English
                </button>
                <button
                  onClick={() => setSelectedLang('si')}
                  className={`lang-pill ${selectedLang === 'si' ? 'active' : ''}`}
                  style={{
                    padding: '10px 24px',
                    borderRadius: '20px',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.22s ease-in-out',
                    border: selectedLang === 'si' ? 'none' : '1px solid rgba(255,255,255,0.15)',
                    background: selectedLang === 'si' ? '#ffffff' : 'transparent',
                    color: selectedLang === 'si' ? '#070913' : '#94a3b8',
                  }}
                >
                  සිංහල
                </button>
                <button
                  onClick={() => setSelectedLang('ta')}
                  className={`lang-pill ${selectedLang === 'ta' ? 'active' : ''}`}
                  style={{
                    padding: '10px 24px',
                    borderRadius: '20px',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.22s ease-in-out',
                    border: selectedLang === 'ta' ? 'none' : '1px solid rgba(255,255,255,0.15)',
                    background: selectedLang === 'ta' ? '#ffffff' : 'transparent',
                    color: selectedLang === 'ta' ? '#070913' : '#94a3b8',
                  }}
                >
                  தமிழ்
                </button>
              </div>
            </div>
          ) : (
            /* STEPS 1 to 6: SAFE PLAY PRINCIPLES */
            (() => {
              const currentTip = tipsData[selectedLang][activeStep - 1];
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {/* Top content row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px' }}>
                    <div style={{ flex: 1 }}>
                      <span style={{
                        fontSize: '9px',
                        fontWeight: 900,
                        letterSpacing: '1px',
                        color: activeColor,
                        textTransform: 'uppercase',
                        background: `${activeColor}12`,
                        padding: '3px 8px',
                        borderRadius: '12px',
                        border: `1px solid ${activeColor}30`,
                        display: 'inline-block',
                        marginBottom: '8px'
                      }}>{currentTip.category}</span>
                      <h2 style={{
                        fontSize: '22px',
                        fontWeight: 800,
                        color: '#ffffff',
                        lineHeight: '1.25',
                        margin: 0,
                      }}>{currentTip.title}</h2>
                    </div>
                    <div style={{ flexShrink: 0 }}>
                      {getSVGAnimation(activeStep, activeColor)}
                    </div>
                  </div>

                  <p style={{
                    fontSize: '13px',
                    color: '#94a3b8',
                    lineHeight: '1.65',
                    margin: '4px 0 0',
                  }}>{currentTip.body}</p>

                  {/* Quote / Motivation */}
                  <div style={{
                    padding: '10px 14px',
                    borderRadius: '12px',
                    background: 'rgba(255,255,255,0.02)',
                    borderLeft: `3px solid ${activeColor}`,
                    marginTop: '4px',
                  }}>
                    <div style={{ fontSize: '8.5px', fontWeight: 800, color: activeColor, letterSpacing: '0.5px', marginBottom: '2px' }}>
                      {t.proTip}
                    </div>
                    <div style={{ fontSize: '11px', color: '#e2e8f0', fontStyle: 'italic', fontWeight: 500 }}>
                      &ldquo;{currentTip.motivation}&rdquo;
                    </div>
                  </div>
                </div>
              );
            })()
          )}
        </div>

        {/* Footer Area */}
        <div style={{
          padding: '16px 32px 24px',
          borderTop: '1px solid rgba(255,255,255,0.04)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0,
          background: 'rgba(0,0,0,0.1)'
        }}>
          {/* Back Button */}
          {activeStep > 0 ? (
            <button
              onClick={() => setActiveStep(activeStep - 1)}
              style={{
                padding: '9px 22px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'transparent',
                color: '#94a3b8',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
            >
              &lt; {t.back}
            </button>
          ) : (
            <div style={{ width: '1px' }} />
          )}

          {/* Next / Completion Button */}
          {activeStep < totalSteps - 1 ? (
            <button
              onClick={() => setActiveStep(activeStep + 1)}
              style={{
                padding: '9px 24px',
                borderRadius: '20px',
                fontSize: '12.5px',
                fontWeight: 800,
                cursor: 'pointer',
                border: 'none',
                background: '#ffffff',
                color: '#070913',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'transform 0.15s ease',
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.03)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              {t.next} &gt;
            </button>
          ) : (
            <button
              onClick={handleClose}
              style={{
                padding: '9px 24px',
                borderRadius: '20px',
                fontSize: '12.5px',
                fontWeight: 800,
                cursor: 'pointer',
                border: 'none',
                background: `linear-gradient(135deg, ${activeColor}, #38bdf8)`,
                color: '#070913',
                boxShadow: `0 0 15px ${activeColor}40`,
                transition: 'transform 0.15s ease',
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.03)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              {t.gotIt}
            </button>
          )}

          {/* Bottom Progress Bar */}
          <div style={{
            position: 'absolute',
            bottom: 0, left: 0, right: 0,
            height: '4px',
            backgroundColor: 'rgba(255,255,255,0.04)',
          }}>
            <div style={{
              height: '100%',
              width: `${((activeStep + 1) / totalSteps) * 100}%`,
              backgroundColor: activeColor,
              transition: 'width 0.4s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.4s ease',
            }} />
          </div>
        </div>
      </div>

      <style>{`
        .lang-pill:hover {
          border-color: rgba(255,255,255,0.4) !important;
          transform: translateY(-1px);
        }
        .lang-pill.active:hover {
          transform: none;
        }
        
        /* Premium Keyframe Animations for SVG elements */
        .svg-spin {
          animation: spRotate 8s linear infinite;
          transform-origin: 50px 50px;
        }
        .svg-spin-reverse {
          animation: spRotateReverse 8s linear infinite;
          transform-origin: 50px 50px;
        }
        .svg-pulse {
          animation: spPulse 2s ease-in-out infinite;
          transform-origin: 50px 50px;
        }
        .svg-draw {
          stroke-dasharray: 40;
          stroke-dashoffset: 40;
          animation: spDraw 2s ease-out forwards infinite;
        }
        .svg-rotate {
          animation: spRotate 10s linear infinite;
          transform-origin: 50px 50px;
        }
        .svg-tilt {
          animation: spTilt 3s ease-in-out infinite;
          transform-origin: 50px 75px;
        }
        .svg-beat {
          animation: spBeat 1.4s ease-in-out infinite;
          transform-origin: 50px 50px;
        }
        .svg-dash {
          stroke-dashoffset: 20;
          animation: spDash 1.2s linear infinite;
        }
        .svg-dash-reverse {
          stroke-dashoffset: -20;
          animation: spDash 1.2s linear infinite;
        }

        @keyframes spRotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes spRotateReverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        @keyframes spPulse {
          0%, 100% { transform: scale(1); opacity: 0.15; }
          50% { transform: scale(1.15); opacity: 0.65; }
        }
        @keyframes spDraw {
          0% { stroke-dashoffset: 40; }
          60%, 100% { stroke-dashoffset: 0; }
        }
        @keyframes spTilt {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-5deg); }
          75% { transform: rotate(5deg); }
        }
        @keyframes spBeat {
          0%, 100% { transform: scale(1); }
          20% { transform: scale(1.08); }
          40% { transform: scale(0.97); }
          60% { transform: scale(1.04); }
        }
        @keyframes spDash {
          to { stroke-dashoffset: 0; }
        }

        @keyframes spFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes spSlideUp {
          from { opacity: 0; transform: translateY(24px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0)   scale(1); }
        }

        /* Mobile Native App Wizard Feeling */
        @media (max-width: 520px) {
          .onboarding-card {
            max-width: 100vw !important;
            width: 100vw !important;
            height: 100vh !important;
            max-height: 100vh !important;
            border-radius: 0 !important;
            border: none !important;
          }
        }
      `}</style>
    </div>
  ) : null;

  return (
    <>
      {/* ── Bubble Button in header ── */}
      <button
        onClick={() => {
          setActiveStep(0);
          setOpen(true);
        }}
        title="Safe Play Tips"
        style={{
          position: 'relative',
          background: 'linear-gradient(135deg, rgba(0,229,160,0.1), rgba(56,189,248,0.1))',
          border: '1px solid rgba(0,229,160,0.2)',
          borderRadius: '10px',
          padding: '6px 12px',
          display: 'flex', alignItems: 'center', gap: '6px',
          color: '#00e5a0',
          fontSize: '13px', fontWeight: 700,
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
      >
        <ShieldCheck size={14} />
        <span className="sp-label">{selectedLang === 'si' ? 'ආරක්ෂිත ක්‍රීඩාව' : selectedLang === 'ta' ? 'பாதுகாப்பு' : 'Safe Play'}</span>
        {/* Blinking notification dot */}
        <span style={{
          position: 'absolute', top: '-4px', right: '-4px',
          width: '9px', height: '9px',
          borderRadius: '50%', backgroundColor: '#00e5a0',
          boxShadow: '0 0 8px #00e5a0',
          animation: 'safePulse 1.4s ease-in-out infinite',
          display: firstTime || open ? 'block' : 'none',
        }} />
      </button>

      {/* ── Portal: renders the overlay at document.body level ── */}
      {mounted && createPortal(modalContent, document.body)}

      <style>{`
        @keyframes safePulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.6); opacity: 0.5; }
        }
        @media (max-width: 520px) { .sp-label { display: none; } }
      `}</style>
    </>
  );
}
