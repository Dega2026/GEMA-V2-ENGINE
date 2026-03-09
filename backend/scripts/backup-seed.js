/* eslint-disable no-console */
/**
 * GEMA Safe Point Snapshot
 * Generated automatically to preserve current English site texts.
 * Run with:
 *   node backend/scripts/backup-seed.js --backup-json
 *   node backend/scripts/backup-seed.js --restore-page-content
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const PageContent = require('../models/PageContent');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const SAFE_POINT = {
  "generatedAt": "2026-03-05T19:50:23.605Z",
  "source": "frontend/src/js/translations.js (en) + operations/about defaults",
  "supportedLanguages": [
    "ar",
    "en",
    "de",
    "zh",
    "tr"
  ],
  "englishTranslations": {
    "nav_home": "Home Hub",
    "nav_mfg": "Manufacturing",
    "nav_prod": "Products",
    "nav_trade": "Trading",
    "nav_sectors": "Sectors",
    "nav_eng": "Engineering",
    "nav_reg": "Regulatory Affairs",
    "nav_turnkey": "Turnkey Solutions",
    "nav_news": "Newsroom",
    "nav_about": "About",
    "nav_contact": "Contact",
    "nav_quote": "Get a Quote",
    "nav_rights": "All Rights Reserved",
    "foot_desc": "A Leading German-Egyptian Group shaping the future of medical technology through industrial excellence and digital innovation.",
    "foot_quick": "Quick Links",
    "foot_story": "Our Story",
    "foot_catalog": "Product Catalog",
    "foot_news": "Newsroom",
    "foot_hubs": "Global Hubs",
    "hub_cairo": "Cairo, Egypt",
    "hub_hq": "(Headquarters)",
    "hub_riyadh": "Riyadh, Saudi Arabia",
    "hub_reg": "(Regional Office)",
    "hub_shanghai": "Shanghai, China",
    "hub_log": "(Logistics Center)",
    "foot_partner": "Tech Partner",
    "foot_msa": "Digital Ecosystem by MSA Agency.",
    "foot_engineered": "Engineered by MSA Intelligence Unit.",
    "hero_subtitle": "GEMA MEDICAL & MSA INTELLIGENCE",
    "hero_title": "The Future of <br /><span>Medical Industry</span>",
    "hero_p": "Advanced manufacturing meets digital intelligence. Exploring the multiverse of healthcare.",
    "btn_catalog": "Our Catalog",
    "btn_sectors": "View Sectors",
    "multi_subtitle": "The Multiverse",
    "multi_title": "Six Specialized <span>Sectors</span>",
    "tag_industry": "Industry",
    "tag_portfolio": "Portfolio",
    "tag_logistics": "Logistics",
    "tag_projects": "Projects",
    "tag_compliance": "Compliance",
    "tag_fullscope": "Full Scope",
    "sect_man": "Manufacturing",
    "sect_prod": "Medical Products",
    "sect_trade": "Global Trading",
    "sect_eng": "Engineering",
    "sect_reg": "Regulatory Affairs",
    "sect_turnkey": "Turnkey Solutions",
    "link_factory": "Explore Factory",
    "link_view": "View Catalog",
    "link_china": "China Hub",
    "link_hospital": "Hospital Setup",
    "link_sfda": "SFDA & EDA",
    "link_total": "Total Delivery",
    "mfg_status_auto": "Fully Automated Production",
    "mfg_title_injection": "High-Precision <br /><span>Injection Systems</span>",
    "mfg_body_injection": "GEMA operates state-of-the-art German assembly lines for 3-part syringes. With an annual capacity of 150 million units, our facility ensures zero-human-touch manufacturing within Class 100,000 cleanrooms.",
    "mfg_spec_sal": "Sterility Assurance Level (SAL) 10⁻⁶",
    "mfg_spec_ai": "AI-Integrated Quality Control",
    "mfg_btn_specs": "VIEW PRODUCTION SPECS",
    "mfg_status_rd": "Advanced R&D Unit",
    "mfg_title_vascular": "Next-Gen <br /><span>Vascular Access</span>",
    "mfg_body_vascular": "Our IV Cannula production lines utilize automated needle-grinding and siliconization technology. This guarantees maximum patient comfort and precision in every single unit produced.",
    "mfg_spec_raw": "Medical Grade Raw Materials",
    "mfg_spec_iso": "ISO 13485 Certified Line",
    "mfg_btn_safety": "DISCOVER SAFETY FEATURES",
    "mfg_status_40": "Industry 4.0",
    "mfg_title_smart": "The Future of <br /><span>Smart Manufacturing</span>",
    "mfg_body_smart": "At GEMA MEDICAL, we are transitioning to a fully digitized 'Smart Factory' ecosystem. Real-time data monitoring allows us to maintain 99.9% production uptime.",
    "mfg_btn_audit": "REQUEST FACTORY AUDIT",
    "prod_page_title": "Our Medical <span>Portfolio</span>",
    "prod_loading": "Loading the future...",
    "prod_no_found": "No products found in the empire yet...",
    "prod_btn_specs": "EXPLORE SPECS",
    "prod_error": "System Error: Please start the server or check the database.",
    "trade_subtitle": "GEMA Global Logistics",
    "trade_title": "Global <span>Trading Hub</span>",
    "trade_tag_sh": "Shanghai Hub",
    "trade_h3_source": "Direct Sourcing",
    "trade_p_source": "Our permanent office in Shanghai ensures 100% factory audit and quality compliance before shipping to the Middle East.",
    "trade_tag_sc": "Supply Chain",
    "trade_h3_log": "End-to-End Logistics",
    "trade_p_log": "From production lines in Asia to hospitals in Riyadh and Cairo, we handle the entire multiverse of medical supply chain.",
    "eng_title": "Medical <span>Engineering</span>",
    "eng_tag_infra": "Infrastructure",
    "eng_h3_or": "Turnkey Operating Rooms",
    "eng_p_or": "Designing and installing modular OR systems with German-standard sterilization and laminar flow units.",
    "eng_tag_service": "Service",
    "eng_h3_maint": "Biomedical Maintenance",
    "eng_p_maint": "24/7 technical support for high-end medical equipment, ensuring zero downtime for critical healthcare units.",
    "reg_tag_gcc": "🇸🇦 GCC Markets",
    "reg_h3_sfda": "SFDA Registration",
    "reg_p_sfda": "Specialized services for Saudi Food & Drug Authority registration, medical device marketing authorization (MDMA), and AR representation.",
    "reg_btn_inquire": "Request Consultation",
    "reg_btn_view": "View Process",
    "reg_btn_cert": "View Certificates",
    "reg_btn_eu": "Compliance Details",
    "reg_subtitle": "Global Compliance",
    "reg_title": "Regulatory <span>& Licensing</span>",
    "reg_tag_comp": "📜 Compliance",
    "reg_h3_eda": "EDA Registration",
    "reg_p_eda": "Full support for Egyptian Drug Authority product registration, industrial licensing, and navigating technical regulations for medical devices.",
    "reg_tag_qc": "🛡️ Quality Control",
    "reg_h3_iso": "ISO 13485 Implementation",
    "reg_p_iso": "Expert implementation of Quality Management Systems (QMS) specifically designed for medical device manufacturing and global distribution.",
    "reg_tag_eu": "🇪🇺 European Markets",
    "reg_h3_ce": "CE Marking & Technical Files",
    "reg_p_ce": "Comprehensive technical file preparation and clinical evaluation reports for seamless entry into the European and international markets.",
    "tk_subtitle": "Total Delivery",
    "tk_title": "Turnkey <span>Factory Projects</span>",
    "tk_phase1": "Phase 01",
    "tk_h3_concept": "Concept & Design",
    "tk_p_concept": "Complete architectural and technical planning for medical facilities, ensuring compliance with international ISO and Cleanroom standards.",
    "tk_phase2": "Phase 02",
    "tk_h3_setup": "Machinery & Setup",
    "tk_p_setup": "Sourcing and installation of high-end production lines from our global partners, integrated with GEMA's smart monitoring systems.",
    "tk_phase3": "Phase 03",
    "tk_h3_ops": "Operational Support",
    "tk_p_ops": "Staff training, know-how transfer, and initial production supervision until your facility reaches full operational capacity.",
    "news_subtitle": "GEMA Intelligence Unit",
    "news_title": "News & <span>Global Insights</span>",
    "news_tag_china": "Upcoming Event | April 2026",
    "news_h3_china": "China Hub Strategy: Shanghai 2026",
    "news_p_china": "Our technical team is heading to Shanghai to test new machinery and produce samples for our upcoming AI-integrated medical production lines.",
    "news_tag_riyadh": "Expansion | Feb 2026",
    "news_h3_riyadh": "Riyadh Regional HQ Launch",
    "news_p_riyadh": "GEMA MEDICAL officially scales its operations in Saudi Arabia, establishing a primary hub to serve the Kingdom's Vision 2030 healthcare goals.",
    "news_tag_factory": "Company | Feb 2026",
    "news_h3_factory": "New Factory Commissioning",
    "news_p_factory": "Successfully completed the turnkey setup for a new medical IV set factory in Cairo, significantly expanding our regional production capacity.",
    "news_tag_log": "Logistics | Jan 2026",
    "news_h3_log": "Shanghai Logistics Hub Activation",
    "news_p_log": "Our permanent office in Shanghai is now fully operational, streamlining the global medical supply chain for all Middle Eastern partners.",
    "news_tag_comp": "Compliance | Dec 2025",
    "news_h3_comp": "EDA 100% Compliance Achievement",
    "news_p_comp": "GEMA Global has achieved full certification under the latest Egyptian Drug Authority standards for 2026 medical industrial licensing.",
    "news_tag_ai": "Insights | Nov 2025",
    "news_h3_ai": "AI-Driven Lab Diagnostics",
    "news_p_ai": "Exploring the next generation of automated IVD diagnostic equipment and how AI-driven results are shaping the future of medical labs.",
    "abt_subtitle": "THE GEMA MULTIVERSE",
    "abt_title": "Shaping the <span>Medical Future</span>",
    "abt_tag_hub": "Manufacturing Hub",
    "abt_h3_excel": "Industrial Excellence",
    "abt_p_excel": "GEMA MEDICAL is a specialized manufacturing power, merging German industrial standards with local innovation from our Cairo facilities.",
    "abt_tag_msa": "Powered by MSA Agency",
    "abt_h3_intel": "Digital Intelligence",
    "abt_p_intel": "Our digital ecosystem, AI integration, and global branding are powered by MSA Agency, ensuring GEMA remains at the forefront of MedTech.",
    "abt_tag_net": "Global Network",
    "abt_h3_hubs": "Riyadh & Shanghai Hubs",
    "abt_p_hubs": "With our regional HQ in Riyadh and our logistics center in Shanghai, we ensure a seamless medical supply chain across the multiverse.",
    "abt_vision_h2": "Our Vision",
    "abt_vision_p": "To become the primary medical infrastructure partner in the region, bridging the gap between high-tech manufacturing and global logistics.",
    "ct_subtitle": "GLOBAL CONNECTIVITY",
    "ct_title": "Connect with the <span>Empire</span>",
    "ct_h3_form": "Send an Inquiry",
    "ct_ph_name": "Full Name",
    "ct_ph_email": "Business Email",
    "ct_ph_subject": "Subject (e.g. Turnkey Factory, Trading...)",
    "ct_ph_msg": "Describe your requirements...",
    "ct_btn": "INITIALIZE CONTACT",
    "ct_h4_riyadh": "Riyadh Regional HQ",
    "ct_addr_riyadh": "KAFD, Riyadh, Kingdom of Saudi Arabia",
    "ct_note_riyadh": "Primary Hub for GCC Operations",
    "ct_h4_cairo": "Cairo Factory & HQ",
    "ct_addr_cairo": "Public Free Zone, Nasr City, Cairo, Egypt",
    "ct_note_cairo": "Manufacturing & Regulatory Center",
    "ct_h4_sh": "Shanghai Logistics Hub",
    "ct_addr_sh": "Pudong District, Shanghai, China",
    "ct_note_sh": "Sourcing & Quality Auditing",
    "q_title": "Initialize <span>Partnership</span>",
    "q_desc": "Fill out the technical requirements below. Our engineering unit will respond within 24 hours.",
    "q_ph_name": "Full Name",
    "q_ph_email": "Business Email",
    "q_ph_company": "Company Name",
    "q_opt_sector": "Select Sector",
    "q_opt_mfg": "Manufacturing (OEM)",
    "q_opt_trade": "Global Trading",
    "q_opt_eng": "Medical Engineering",
    "q_opt_tk": "Turnkey Solutions",
    "q_ph_specs": "Technical Specifications / Quantity",
    "q_btn": "SUBMIT REQUEST"
  },
  "pageContentEnglish": {
    "direct-sourcing": {
      "title": "Direct Sourcing",
      "cards": [
        {
          "title": "Global Supplier Network",
          "text": "Sourcing through qualified global healthcare suppliers.",
          "image": ""
        },
        {
          "title": "Quality Compliance",
          "text": "Supplier qualification aligned with regulatory requirements.",
          "image": ""
        },
        {
          "title": "Cost Optimization",
          "text": "Strategic sourcing designed for better cost efficiency.",
          "image": ""
        }
      ]
    },
    "logistics": {
      "title": "Logistics",
      "cards": [
        {
          "title": "End-to-End Shipping",
          "text": "Managed transportation from origin to destination.",
          "image": ""
        },
        {
          "title": "Cold Chain Readiness",
          "text": "Temperature-controlled workflows for sensitive products.",
          "image": ""
        },
        {
          "title": "Customs Coordination",
          "text": "Customs and clearance support for smooth delivery.",
          "image": ""
        }
      ]
    },
    "about": {
      "title": "About GEMA",
      "cards": [
        {
          "title": "Riyadh & Shanghai Centers",
          "text": "Operations in Riyadh with sourcing strength in Shanghai.",
          "image": ""
        },
        {
          "title": "Digital Intelligence",
          "text": "Data-driven operational and strategic decision-making.",
          "image": ""
        },
        {
          "title": "Industrial Excellence",
          "text": "Manufacturing discipline and execution quality at scale.",
          "image": ""
        }
      ]
    }
  }
};

async function backupToJson() {
  const outDir = path.join(__dirname, '../backups');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'safe-point-en.json');
  fs.writeFileSync(outPath, JSON.stringify(SAFE_POINT, null, 2), 'utf8');
  console.log('Safe point JSON written to:', outPath);
}

async function restorePageContentToDb() {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/gema_v2';
  await mongoose.connect(uri);

  const pageSlugs = Object.keys(SAFE_POINT.pageContentEnglish);

  for (const slug of pageSlugs) {
    const en = SAFE_POINT.pageContentEnglish[slug];
    const content = {
      ar: { title: '', cards: [] },
      en,
      de: { title: '', cards: [] },
      zh: { title: '', cards: [] },
      tr: { title: '', cards: [] }
    };

    await PageContent.findOneAndUpdate(
      { slug },
      { slug, content },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  await mongoose.disconnect();
  console.log('Page content restored from safe point for slugs:', pageSlugs.join(', '));
}

async function main() {
  const mode = process.argv[2] || '--backup-json';

  if (mode === '--backup-json') {
    await backupToJson();
    return;
  }

  if (mode === '--restore-page-content') {
    await restorePageContentToDb();
    return;
  }

  console.log('Usage:');
  console.log('  node backend/scripts/backup-seed.js --backup-json');
  console.log('  node backend/scripts/backup-seed.js --restore-page-content');
}

main().catch((error) => {
  console.error('backup-seed failed:', error);
  process.exit(1);
});
