import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
    en: {
        translation: {
            "dashboard_title": "EduGuard",
            "your_kids": "YOUR KIDS",
            "add_kid": "Add Kid",
            "logout": "Logout",
            "active": "Active",
            "free": "Free",
            "premium": "Premium",
            "dashboard_welcome": "Parent Dashboard",
            "select_kid": "Select a kid to view details",
            "recent_chats": "Recent Chats",
            "stats": "Statistics",
            "generate_qp": "Generate Practice Paper",
            "topics_covered": "Topics Covered",
            "mastery": "Mastery Score",
            "change_language": "Language",
        }
    },
    hi: {
        translation: {
            "dashboard_title": "एडुगार्ड",
            "your_kids": "आपके बच्चे",
            "add_kid": "बच्चा जोड़ें",
            "logout": "लॉग आउट",
            "active": "सक्रिय",
            "free": "निःशुल्क",
            "premium": "प्रीमियम",
            "dashboard_welcome": "अभिभावक डैशबोर्ड",
            "select_kid": "विवरण देखने के लिए बच्चे का चयन करें",
            "recent_chats": "हालिया बातचीत",
            "stats": "आंकड़े",
            "generate_qp": "अभ्यास पेपर बनाएं",
            "topics_covered": "कवर किए गए विषय",
            "mastery": "महारत स्कोर",
            "change_language": "भाषा",
        }
    },
    es: {
        translation: {
            "dashboard_title": "EduGuard",
            "your_kids": "TUS NIÑOS",
            "add_kid": "Añadir Niño",
            "logout": "Cerrar Sesión",
            "active": "Activo",
            "free": "Gratis",
            "premium": "Premium",
            "dashboard_welcome": "Panel de Padres",
            "select_kid": "Selecciona un niño para ver detalles",
            "recent_chats": "Chats Recientes",
            "stats": "Estadísticas",
            "generate_qp": "Generar Prueba Práctica",
            "topics_covered": "Temas Cubiertos",
            "mastery": "Puntuación de Maestría",
            "change_language": "Idioma",
        }
    },
    kn: {
        translation: {
            "dashboard_title": "ಎಡುಗಾರ್ಡ್",
            "your_kids": "ನಿಮ್ಮ ಮಕ್ಕಳು",
            "add_kid": "ಮಗುವನ್ನು ಸೇರಿಸಿ",
            "logout": "ಲಾಗ್ ಔಟ್",
            "active": "ಸಕ್ರಿಯ",
            "free": "ಉಚಿತ",
            "premium": "ಪ್ರೀಮಿಯಂ",
            "dashboard_welcome": "ಪೋಷಕರ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್",
            "select_kid": "ವಿವರಗಳನ್ನು ನೋಡಲು ಮಗುವನ್ನು ಆಯ್ಕೆಮಾಡಿ",
            "recent_chats": "ಇತ್ತೀಚಿನ ಚಾಟ್‌ಗಳು",
            "stats": "ಅಂಕಿಅಂಶಗಳು",
            "generate_qp": "ಅಭ್ಯಾಸ ಪತ್ರಿಕೆ ರಚಿಸಿ",
            "topics_covered": "ಒಳಗೊಂಡಿರುವ ವಿಷಯಗಳು",
            "mastery": "ಪಾಂಡಿತ್ಯ ಸ್ಕೋರ್",
            "change_language": "ಭಾಷೆ",
        }
    },
    ta: {
        translation: {
            "dashboard_title": "எடுகார்ட்",
            "your_kids": "உங்கள் குழந்தைகள்",
            "add_kid": "குழந்தையைச் சேர்க்கவும்",
            "logout": "வெளியேறு",
            "active": "செயலில்",
            "free": "இலவசம்",
            "premium": "பிரீமியம்",
            "dashboard_welcome": "பெற்றோர் டாஷ்போர்டு",
            "select_kid": "விவரங்களைப் பார்க்க குழந்தையைத் தேர்ந்தெடுக்கவும்",
            "recent_chats": "சமீபத்திய அரட்டைகள்",
            "stats": "புள்ளிவிவரங்கள்",
            "generate_qp": "பயிற்சி தாளை உருவாக்கவும்",
            "topics_covered": "உள்ளடக்கிய தலைப்புகள்",
            "mastery": "தேர்ச்சி மதிப்பெண்",
            "change_language": "மொழி",
        }
    },
    te: {
        translation: {
            "dashboard_title": "ఎడుగార్డ్",
            "your_kids": "మీ పిల్లలు",
            "add_kid": "పిల్లవాడిని జోడించండి",
            "logout": "లాగ్ అవుట్",
            "active": "చురుకుగా",
            "free": "ఉచిత",
            "premium": "ప్రీమియం",
            "dashboard_welcome": "తల్లిదండ్రుల డాష్‌బోర్డ్",
            "select_kid": "వివరాలను చూడటానికి పిల్లవాడిని ఎంచుకోండి",
            "recent_chats": "ఇటీవలి చాట్‌లు",
            "stats": "గణాంకాలు",
            "generate_qp": "ప్రాక్టీస్ పేపర్‌ను రూపొందించండి",
            "topics_covered": "కవర్ చేయబడిన అంశాలు",
            "mastery": "నైపుణ్యం స్కోరు",
            "change_language": "భాష",
        }
    },
    ml: {
        translation: {
            "dashboard_title": "എഡ്യൂഗാർഡ്",
            "your_kids": "നിങ്ങളുടെ കുട്ടികൾ",
            "add_kid": "കുട്ടിയെ ചേർക്കുക",
            "logout": "ലോഗ് ഔട്ട്",
            "active": "സജീവം",
            "free": "സൗജന്യം",
            "premium": "പ്രീമിയം",
            "dashboard_welcome": "രക്ഷിതാക്കളുടെ ഡാഷ്‌ബോർഡ്",
            "select_kid": "വിശദാംശങ്ങൾ കാണാൻ കുട്ടിയെ തിരഞ്ഞെടുക്കുക",
            "recent_chats": "സമീപകാല ചാറ്റുകൾ",
            "stats": " സ്ഥിതിവിവരക്കണക്കുകൾ",
            "generate_qp": "പരിശീലന പേപ്പർ സൃഷ്ടിക്കുക",
            "topics_covered": "ഉൾക്കൊള്ളുന്ന വിഷയങ്ങൾ",
            "mastery": "മാസ്റ്ററി സ്കോർ",
            "change_language": "ഭാഷ",
        }
    }
};

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources,
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false
        }
    });

export default i18n;
